/**
 * 《月背拾遗司》第一案：迟到的月光。
 * 基于仓库故事初稿的幻想改编；不指代或补写真实私人经历。
 * 本模块只保存内容与绘制所需的静态数据，不负责交互状态。
 */

export type Speaker = 'fox' | 'dog' | 'ledger';
export type ChapterId = 'cabinet' | 'tickets' | 'echo' | 'clasp' | 'home';

export interface DialogueLine {
  speaker: Speaker;
  text: string;
}

export interface Chapter {
  id: ChapterId;
  title: string;
  kicker: string;
  description: string;
  intro: readonly DialogueLine[];
  outro: readonly DialogueLine[];
  hint: string;
  directHint: string;
  actionLabel: string;
  solvedLabel: string;
  skipLabel: string;
}

export const storyMeta = {
  title: '月背拾遗司',
  subtitle: '小狐狸和小狗的第一夜值班',
  caseTitle: '迟到的月光',
  caseNumber: '第〇〇七号',
  invitation: '月亮背面，今晚有人值班。',
  startLabel: '推开第七号柜',
  resumeLabel: '接着今晚的值班',
  revisitLabel: '再打开一次',
  finalLabel: '下次一起打开',
} as const;

export const speakers: Record<Speaker, string> = {
  fox: '小狐狸',
  dog: '小狗',
  ledger: '登记簿',
};

export const chapters: readonly Chapter[] = [
  {
    id: 'cabinet',
    title: '一枚没有合上的月亮',
    kicker: '第一夜 · 第七号柜',
    description: '翻到胸针背面，看看它少了什么。',
    intro: [
      { speaker: 'fox', text: '第七号柜又没有关严。' },
      { speaker: 'dog', text: '这回不是我。它自己开的。' },
      { speaker: 'fox', text: '里面有一枚月亮。' },
      { speaker: 'dog', text: '登记一下。月亮，一枚。' },
    ],
    outro: [
      { speaker: 'fox', text: '背面空了一小格。像缺了一颗牙。' },
      { speaker: 'dog', text: '是扣座。两只孔，还有一个小缺口。' },
      { speaker: 'fox', text: '下面这张票……怎么越拉越长？' },
      { speaker: 'dog', text: '先别拉了。长椅出来了。' },
    ],
    hint: '碰一下胸针，让它翻个面。',
    directHint: '胸针背面的两个小孔之间，少了一枚扣件。',
    actionLabel: '翻看胸针',
    solvedLabel: '走进候车室',
    skipLabel: '请小狗翻给我看',
  },
  {
    id: 'tickets',
    title: '还没有出发的车票',
    kicker: '第一段时间 · 候车室',
    description: '点两张车票交换位置，让月光线和椅背线都接起来。',
    intro: [
      { speaker: 'dog', text: '这只钟比那只早了三年。' },
      { speaker: 'fox', text: '旁边那只呢？' },
      { speaker: 'dog', text: '它不愿意透露年龄。' },
      { speaker: 'fox', text: '先不问钟了。三张票背面，画的是同一条长椅。' },
    ],
    outro: [
      { speaker: 'fox', text: '接上了。这里还压着一小片银光。' },
      { speaker: 'dog', text: '在扶手旁边。伸手就能碰到。' },
      { speaker: 'fox', text: '它一直给自己留着座位。' },
      { speaker: 'dog', text: '门开了。看来这一班不用检票。' },
    ],
    hint: '别看年份。每条接缝都有两条线，两条都要接上。',
    directHint: '左端接住高低两根线，再顺着接缝找下一张；正确次序是「尚未出发」「目的地待定」「想起之前」。',
    actionLabel: '交换两张车票',
    solvedLabel: '穿过星光里的车门',
    skipLabel: '请小狐狸拼好',
  },
  {
    id: 'echo',
    title: '一句话还在路上',
    kicker: '第二段时间 · 回声星球',
    description: '送出一句话，等光点抵达，再让另一句出发。',
    intro: [
      { speaker: 'fox', text: '这里好安静。' },
      { speaker: 'dog', text: '你刚才说什么？' },
      { speaker: 'fox', text: '咦，我的话还在那座山后面。' },
      { speaker: 'dog', text: '有条发光的路。我坐在这里等它。' },
    ],
    outro: [
      { speaker: 'dog', text: '到了。' },
      { speaker: 'fox', text: '跑了那么远，声音倒是一点也不喘。' },
      { speaker: 'dog', text: '它留下一颗小石头。你托一下月亮。' },
      { speaker: 'fox', text: '正好。裂缝透光了。' },
    ],
    hint: '看沿着细线前进的光点。它到达另一端后，就可以接下一句话。',
    directHint: '先送出小狗的「我在这里」，抵达后，再送出小狐狸的「我知道」。',
    actionLabel: '送出这句话',
    solvedLabel: '沿着银铃声走',
    skipLabel: '让回声快一点抵达',
  },
  {
    id: 'clasp',
    title: '最小的一件东西',
    kicker: '第三段时间 · 月背首饰街',
    description: '比一比两个孔的距离，还有扣座下方的小缺口。',
    intro: [
      { speaker: 'fox', text: '这条街应该写进值班手册。' },
      { speaker: 'dog', text: '已经写了：漂亮东西很多，容易耽误下班。' },
      { speaker: 'fox', text: '别动。你衣领上少一颗星星。' },
      { speaker: 'dog', text: '现在不少了。你看这边，有人把扣件分好了。' },
    ],
    outro: [
      { speaker: 'dog', text: '两个孔对上了。我托住这里。' },
      { speaker: 'fox', text: '小缺口也合上了。' },
      { speaker: 'dog', text: '咔哒。' },
      { speaker: 'fox', text: '这个声音，比整条街都好听。' },
    ],
    hint: '先看两只孔能不能同时对上，再看下面的缺口。',
    directHint: '第三枚旧银扣的双孔间距和方形缺口，都与扣座一致。',
    actionLabel: '试一试这枚扣件',
    solvedLabel: '循着灯回去',
    skipLabel: '和小狗一起装好',
  },
  {
    id: 'home',
    title: '给它留一个位置',
    kicker: '夜班尾声 · 第七号柜',
    description: '把修好的月亮放回软布上，再贴一张新标签。',
    intro: [
      { speaker: 'fox', text: '你留的灯，一盏都没有灭。' },
      { speaker: 'dog', text: '第七号柜也还开着。' },
      { speaker: 'fox', text: '它到底是从哪一年跑来的？' },
      { speaker: 'dog', text: '不知道。我们先把今晚写清楚。' },
    ],
    outro: [
      { speaker: 'fox', text: '就放这里。我伸手够得到。' },
      { speaker: 'dog', text: '我也是。标签写好了。' },
      { speaker: 'ledger', text: '下次一起打开。' },
    ],
    hint: '柜里的软布，正好放得下一枚月亮。',
    directHint: '点击软布安放胸针，然后贴好「下次一起打开」的标签。',
    actionLabel: '安放月亮',
    solvedLabel: '贴好标签',
    skipLabel: '一起收好',
  },
];

export const openingLabel = [
  { label: '遗失时间', value: '很多年以后' },
  { label: '找到时间', value: '今晚' },
  { label: '收件人', value: '未知' },
  { label: '领取条件', value: '小狐狸与小狗同时到场' },
] as const;

/** 找到时间是记录，不随结尾变化。新发生的事情另增字段。 */
export const closingLabel = [
  { label: '遗失时间', value: '很多年以后' },
  { label: '找到时间', value: '今晚' },
  { label: '收件人', value: '小狐狸与小狗' },
  { label: '安放时间', value: '今晚' },
  { label: '保管位置', value: '第七号柜 · 两人都够得到的地方' },
] as const;

export interface TicketPiece {
  id: 'left' | 'middle' | 'right';
  title: string;
  date: string;
  frontText: string;
  backText: string;
  /** SVG 坐标空间 160 × 100；分别为月光线、椅背线的边缘 y 坐标。 */
  leftEdge: readonly [number, number];
  rightEdge: readonly [number, number];
  moonPath: string;
  benchPath: string;
  detailPath: string;
}

/** 正确次序；游戏初始显示次序见 ticketInitialOrder。线条不可烘入背景图。 */
export const ticketPieces: readonly TicketPiece[] = [
  {
    id: 'left',
    title: '尚未出发',
    date: '去年的明天',
    frontText: '已经到达，但还没有出发',
    backText: '一道月光越过灯座，落向右侧；椅背的细线也延伸到票边。',
    leftEdge: [46, 78],
    rightEdge: [28, 66],
    moonPath: 'M 0 46 C 40 46 100 14 160 28',
    benchPath: 'M 0 78 L 30 78 L 30 66 L 160 66',
    detailPath: 'M 30 66 L 30 91 M 46 66 L 46 84 M 62 66 L 62 84 M 78 66 L 78 84 M 94 66 L 94 84 M 110 66 L 110 84 M 126 66 L 126 84 M 142 66 L 142 84 M 30 84 L 160 84',
  },
  {
    id: 'middle',
    title: '目的地待定',
    date: '明年的昨天',
    frontText: '准备离开，目的地尚未决定',
    backText: '月光线缓缓向下；椅背线经过一处下陷的旧木头。',
    leftEdge: [28, 66],
    rightEdge: [54, 82],
    moonPath: 'M 0 28 C 48 38 108 63 160 54',
    benchPath: 'M 0 66 L 78 66 L 78 82 L 160 82',
    detailPath: 'M 14 66 L 14 84 M 30 66 L 30 84 M 46 66 L 46 84 M 62 66 L 62 84 M 94 82 L 94 92 M 110 82 L 110 92 M 126 82 L 126 92 M 142 82 L 142 92 M 0 84 L 78 84 L 78 92 L 160 92',
  },
  {
    id: 'right',
    title: '想起之前',
    date: '今天以后',
    frontText: '请在想起之前领取',
    backText: '月光从旧木头上升起，绕过扶手旁的一枚银色小月牙。',
    leftEdge: [54, 82],
    rightEdge: [38, 70],
    moonPath: 'M 0 54 C 46 49 74 20 110 29 C 134 35 143 38 160 38',
    benchPath: 'M 0 82 L 90 82 L 90 70 L 160 70',
    detailPath: 'M 14 82 L 14 92 M 30 82 L 30 92 M 46 82 L 46 92 M 62 82 L 62 92 M 78 82 L 78 92 M 90 70 L 90 95 M 106 70 L 106 86 M 122 70 L 122 86 M 138 70 L 138 86 M 0 92 L 90 92 M 90 86 L 160 86',
  },
];

export const ticketInitialOrder: readonly TicketPiece['id'][] = ['right', 'left', 'middle'];
export const ticketFrameEdges = { left: [46, 78], right: [38, 70] } as const;

export const ticketFeedback = {
  selected: '选好了这一张，再点另一张交换。',
  noneJoined: '两条线还没有一起接上。再看看票的边缘。',
  oneJoined: '这一道接缝对上了。另一道还差一点。',
  frameMismatch: '票与票接上了，再看看最外边的两根线。',
  complete: '月光穿过整条长椅。扶手旁，有什么亮了一下。',
} as const;

export const echoLines = [
  { id: 'here', speaker: 'dog', text: '我在这里。', sendLabel: '让小狗说', travelMs: 4200 },
  { id: 'know', speaker: 'fox', text: '我知道。', sendLabel: '让小狐狸回答', travelMs: 4200 },
] as const;

export const echoFeedback = {
  waiting: '这句话还在路上。',
  tooSoon: '前一句还没到，先给它留一点空隙。',
  arrived: '到了。现在可以回答了。',
  complete: '两句话都到了。风轻轻停下来。',
  fastForward: '让这一句先抵达',
  replay: '再听一遍',
} as const;

export interface ClaspPiece {
  id: 'wide' | 'round' | 'silver';
  label: string;
  holeSpacing: number;
  notch: 'square' | 'round';
  fits: boolean;
  feedback: string;
}

export const claspSocket = { holeSpacing: 28, notch: 'square' } as const;

export const claspPieces: readonly ClaspPiece[] = [
  {
    id: 'wide',
    label: '第一枚 · 黄铜扣',
    holeSpacing: 44,
    notch: 'square',
    fits: false,
    feedback: '这枚宽了一点。对上一只孔，另一只就错开了。',
  },
  {
    id: 'round',
    label: '第二枚 · 圆口扣',
    holeSpacing: 28,
    notch: 'round',
    fits: false,
    feedback: '两只孔合适，底下却顶住了。扣座是一个方形的小缺口。',
  },
  {
    id: 'silver',
    label: '第三枚 · 旧银扣',
    holeSpacing: 28,
    notch: 'square',
    fits: true,
    feedback: '孔和缺口都对上了。小狗托住胸针，小狐狸轻轻合拢扣件。',
  },
];

export interface SceneDetail {
  id: string;
  label: string;
  lines: readonly DialogueLine[];
}

/** 可自由翻看的小物件；不阻止主线，也不计收集完成度。 */
export const sceneDetails: Record<ChapterId, readonly SceneDetail[]> = {
  cabinet: [
    {
      id: 'future-label',
      label: '那张奇怪的标签',
      lines: [
        { speaker: 'fox', text: '很多年以后，怎么会在今晚遗失？' },
        { speaker: 'dog', text: '也许它比主人先到了。先别改日期。' },
      ],
    },
    {
      id: 'rules',
      label: '柜台上的值班须知',
      lines: [
        { speaker: 'ledger', text: '过去的记录，请勿涂改。准备好抵达的物品，请妥善送回。' },
        { speaker: 'fox', text: '最后一条是谁添的？' },
        { speaker: 'ledger', text: '请勿将尾巴夹进抽屉。' },
      ],
    },
  ],
  tickets: [
    {
      id: 'clock',
      label: '不肯报年龄的钟',
      lines: [
        { speaker: 'dog', text: '请问，现在几点？' },
        { speaker: 'ledger', text: '钟把两根指针背到了身后。' },
        { speaker: 'fox', text: '它下班了。' },
      ],
    },
    {
      id: 'bench',
      label: '长椅上的空位',
      lines: [
        { speaker: 'fox', text: '这张长椅能坐几个人？' },
        { speaker: 'dog', text: '看他们的尾巴怎么放。' },
      ],
    },
  ],
  echo: [
    {
      id: 'hello',
      label: '山后的那句话',
      lines: [
        { speaker: 'ledger', text: '山后慢慢传来开头的那句：这里好安静。' },
        { speaker: 'dog', text: '现在不算特别安静了。' },
      ],
    },
    {
      id: 'stone',
      label: '透明的小石头',
      lines: [
        { speaker: 'fox', text: '拿起来，里面像有一颗很小的星星。' },
        { speaker: 'dog', text: '先别晃。说不定它还在说话。' },
      ],
    },
  ],
  clasp: [
    {
      id: 'star-pin',
      label: '试戴小星星',
      lines: [
        { speaker: 'fox', text: '好看吗？' },
        { speaker: 'dog', text: '好看。可是我没带钱。' },
        { speaker: 'fox', text: '牌子上写着：夜班员可以借戴。' },
        { speaker: 'dog', text: '那我下次还它。下次。' },
      ],
    },
    {
      id: 'bell',
      label: '轻碰一枚银铃',
      lines: [
        { speaker: 'dog', text: '这枚铃响起来，像钥匙找到了门。' },
        { speaker: 'fox', text: '你连好听的声音都要记一条回去的路。' },
      ],
    },
  ],
  home: [
    {
      id: 'lamps',
      label: '窗外的灯',
      lines: [
        { speaker: 'fox', text: '最后那盏是不是歪了？' },
        { speaker: 'dog', text: '月亮有点圆，不太好放。' },
      ],
    },
    {
      id: 'saved-star',
      label: '还别着的小星星',
      lines: [
        { speaker: 'fox', text: '你还戴着。' },
        { speaker: 'dog', text: '嗯。它今天也值夜班。' },
      ],
    },
  ],
};

export const journeyLines: readonly DialogueLine[] = [
  { speaker: 'fox', text: '那边还有一条小路。' },
  { speaker: 'dog', text: '去看看。我把灯留在这里。' },
  { speaker: 'fox', text: '等一下。这次你走前面，我替你拿灯。' },
];

/** 合柜后再播放；让鸟自己跳出来，保留一拍空白再呈现对白。 */
export const birdCoda: readonly DialogueLine[] = [
  { speaker: 'ledger', text: '咔哒。另一扇小门也开了。' },
  { speaker: 'dog', text: '鸟笼。忘了鸟笼。' },
  { speaker: 'fox', text: '别追了，它们已经坐好了。' },
  { speaker: 'dog', text: '本次抓鸟……' },
  { speaker: 'fox', text: '失败？' },
  { speaker: 'dog', text: '改成观众席满员。' },
];

export const endingRecord: readonly DialogueLine[] = [
  { speaker: 'fox', text: '第一夜值班记录：找回一件迟到的东西。它现在有地方可以去了。' },
  { speaker: 'dog', text: '下次值班，记得关好鸟笼。' },
  { speaker: 'fox', text: '如果忘了，也没关系。' },
];

export const revisitLines: readonly DialogueLine[] = [
  { speaker: 'fox', text: '还在原来的位置。' },
  { speaker: 'dog', text: '灯也是。' },
];
