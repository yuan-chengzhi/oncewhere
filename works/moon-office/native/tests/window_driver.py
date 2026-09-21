"""Real X11 inputs, screenshots and window-close events for native QA.

Run the calling test with /usr/bin/python3 (python3-pil) inside xvfb-run.
No game methods, state setters or synthetic Godot InputEvents are called.
"""
import ctypes
import os
from pathlib import Path
import subprocess
import time

from PIL import ImageGrab


class WindowSession:
    def __init__(self, command, results, userdata, run_name):
        self.command = command
        self.results = Path(results)
        self.userdata = Path(userdata)
        self.run_name = run_name
        self.environment = dict(os.environ, XDG_DATA_HOME=str(self.userdata), LIBGL_ALWAYS_SOFTWARE="1")
        self.process = None
        self.log = None
        self.window = None

    def xdo(self, *arguments):
        return subprocess.check_output(["xdotool", *map(str, arguments)], env=self.environment, text=True, stderr=subprocess.DEVNULL).strip()

    def start(self):
        self.results.mkdir(parents=True, exist_ok=True)
        self.userdata.mkdir(parents=True, exist_ok=True)
        # Xvfb has no window manager to create these atoms. Keep a client open
        # so Godot can find WM_DELETE_WINDOW while it initializes X11.
        self._xlib = ctypes.CDLL("libX11.so.6")
        self._xlib.XOpenDisplay.argtypes = [ctypes.c_char_p]
        self._xlib.XOpenDisplay.restype = ctypes.c_void_p
        self._xlib.XInternAtom.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]
        self._xlib.XInternAtom.restype = ctypes.c_ulong
        self._xlib.XCloseDisplay.argtypes = [ctypes.c_void_p]
        self._display = self._xlib.XOpenDisplay(self.environment["DISPLAY"].encode())
        if not self._display:
            raise RuntimeError("Unable to open X11 display")
        for atom in (b"WM_PROTOCOLS", b"WM_DELETE_WINDOW"):
            self._xlib.XInternAtom(self._display, atom, 0)
        self.log = (self.results / f"{self.run_name}.log").open("w")
        self.process = subprocess.Popen([
            *self.command, "--display-driver", "x11", "--rendering-method", "gl_compatibility",
            "--rendering-driver", "opengl3", "--audio-driver", "Dummy",
            "--position", "0,0", "--resolution", "1280x800",
        ], env=self.environment, stdout=self.log, stderr=subprocess.STDOUT)
        until = time.monotonic() + 30
        while time.monotonic() < until:
            if self.process.poll() is not None:
                self.log.close()
                self._xlib.XCloseDisplay(self._display)
                self._display = None
                raise RuntimeError(f"Game exited during launch; see {self.log.name}")
            try:
                self.window = self.xdo("search", "--onlyvisible", "--pid", self.process.pid).splitlines()[0]
                self.xdo("windowfocus", self.window)
                time.sleep(1.0)
                return self
            except (subprocess.CalledProcessError, IndexError):
                time.sleep(0.1)
        self.process.terminate()
        self.process.wait(timeout=5)
        self.log.close()
        self._xlib.XCloseDisplay(self._display)
        self._display = None
        raise TimeoutError(f"No visible Godot window; see {self.log.name}")

    def key(self, key, wait=0.8):
        self.xdo("windowfocus", self.window)
        self.xdo("key", "--clearmodifiers", key)
        time.sleep(wait)

    def click(self, x, y, wait=0.8):
        self.xdo("mousemove", "--window", self.window, x, y)
        self.xdo("click", "1")
        time.sleep(wait)

    def drag(self, start, end, wait=0.8):
        self.xdo("mousemove", "--window", self.window, *start)
        self.xdo("mousedown", "1")
        for step in range(1, 13):
            point = tuple(round(a + (b - a) * step / 12) for a, b in zip(start, end))
            self.xdo("mousemove", "--window", self.window, *point)
            time.sleep(0.04)
        self.xdo("mouseup", "1")
        time.sleep(wait)

    def capture(self, name):
        dimensions = dict(line.split("=", 1) for line in self.xdo("getwindowgeometry", "--shell", self.window).splitlines())
        x, y, width, height = (int(dimensions[key]) for key in ("X", "Y", "WIDTH", "HEIGHT"))
        image = ImageGrab.grab(bbox=(x, y, x + width, y + height), xdisplay=self.environment["DISPLAY"])
        target = self.results / f"{name}.png"
        image.save(target)
        if image.convert("RGB").getextrema() == ((0, 0), (0, 0), (0, 0)):
            raise AssertionError(f"Black frame: {target}")
        return target

    def close(self):
        """Ask the actual window to close via WM_DELETE_WINDOW and require clean exit."""
        if self.process is None:
            return
        if self.process.poll() is not None:
            self.log.close()
            if self._display:
                self._xlib.XCloseDisplay(self._display)
                self._display = None
            if self.process.returncode:
                raise AssertionError(f"Game exited with status {self.process.returncode}; see {self.log.name}")
            return
        class Data(ctypes.Union):
            _fields_ = [("b", ctypes.c_char * 20), ("s", ctypes.c_short * 10), ("l", ctypes.c_long * 5)]
        class ClientMessage(ctypes.Structure):
            _fields_ = [("type", ctypes.c_int), ("serial", ctypes.c_ulong), ("send_event", ctypes.c_int), ("display", ctypes.c_void_p), ("window", ctypes.c_ulong), ("message_type", ctypes.c_ulong), ("format", ctypes.c_int), ("data", Data)]
        class Event(ctypes.Union):
            _fields_ = [("client", ClientMessage), ("padding", ctypes.c_long * 24)]
        xlib = self._xlib
        xlib.XSendEvent.argtypes = [ctypes.c_void_p, ctypes.c_ulong, ctypes.c_int, ctypes.c_long, ctypes.POINTER(Event)]
        xlib.XFlush.argtypes = [ctypes.c_void_p]
        xlib.XCloseDisplay.argtypes = [ctypes.c_void_p]
        display = self._display
        if not display:
            raise RuntimeError("Unable to open X11 display for window close")
        event = Event()
        event.client.type = 33
        event.client.display = display
        event.client.window = int(self.window)
        event.client.message_type = xlib.XInternAtom(display, b"WM_PROTOCOLS", 0)
        event.client.format = 32
        event.client.data.l[0] = xlib.XInternAtom(display, b"WM_DELETE_WINDOW", 0)
        xlib.XSendEvent(display, int(self.window), 0, 0, ctypes.byref(event))
        xlib.XFlush(display)
        try:
            code = self.process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            self.process.terminate()
            self.process.wait(timeout=5)
            raise AssertionError("Window close did not quit the game within 10 seconds")
        finally:
            self.log.close()
            xlib.XCloseDisplay(display)
            self._display = None
        if code != 0:
            raise AssertionError(f"Game exited with status {code}; see {self.log.name}")

    def __enter__(self):
        return self.start()

    def __exit__(self, *_):
        self.close()
