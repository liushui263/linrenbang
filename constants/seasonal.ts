/**
 * 季节提醒（站长可直接改这个文件）
 *
 * 每条提醒在 months 里列出的月份（美国中部时间）自动出现在首页，
 * 并有自己的分享页 /season/{id}，带微信分享卡片和可长按保存的图片。
 *
 * 字段说明：
 * - id：英文短名，用在网址里，上线后别改（改了旧链接会失效）
 * - enabled：false = 暂时不显示
 * - months：哪几个月显示（1-12）。同一个月有多条时，排在这个列表前面的优先上首页大卡片
 * - icon / color：卡片上的表情图标和主色（#RRGGBB）
 * - title：卡片大标题；subtitle：一句话说明（首页和分享卡片副标题都用它）
 * - tips：分享页上的“该做什么”清单，3-5 条，每条一句话
 * - categories：推荐哪些分类的师傅（见 constants/categories.ts 的 id）
 * - shareTitle：发到微信群时卡片上的标题
 */
export interface SeasonalReminder {
  id: string;
  enabled: boolean;
  months: number[];
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  tips: string[];
  categories: string[];
  shareTitle: string;
}

export const SEASONAL_REMINDERS: SeasonalReminder[] = [
  {
    id: "freeze",
    enabled: true,
    months: [12, 1, 2],
    icon: "🥶",
    color: "#0369a1",
    title: "寒潮来前，水管防冻",
    subtitle: "休斯顿一冻就爆管，提前包好室外水管，比事后修便宜得多",
    tips: [
      "室外水龙头、裸露水管包上保温套或毛巾",
      "冻雨夜让室内水龙头细细滴水，橱柜门打开透气",
      "记住总水阀的位置，爆管时第一时间关掉",
      "车库、阁楼里的热水器和管道也检查一遍",
      "已经冻住别用明火烤，找水管师傅处理",
    ],
    categories: ["plumbing"],
    shareTitle: "寒潮防冻提醒：水管包好了吗？附邻居推荐的水管师傅",
  },
  {
    id: "tax",
    enabled: true,
    months: [1, 2, 3, 4],
    icon: "🧾",
    color: "#0f766e",
    title: "报税季开始了",
    subtitle: "4 月 15 日截止，W-2、1099 到齐就可以约会计师了",
    tips: [
      "1 月底前收齐 W-2、1099、房贷利息 1098 等表格",
      "有房的别忘了地税单（Property Tax）",
      "自雇、出租房、海外资产（FBAR）提前和会计师说",
      "来不及可以申请延期，但税款仍要 4 月 15 日前付",
    ],
    categories: ["tax", "finance_insurance"],
    shareTitle: "报税季到了：邻居推荐的华人会计师",
  },
  {
    id: "pest",
    enabled: true,
    months: [3, 4],
    icon: "🐜",
    color: "#c2410c",
    title: "春天白蚁季，除虫要趁早",
    subtitle: "三四月白蚁、火蚁、蟑螂最活跃，先检查再处理",
    tips: [
      "傍晚灯下看到成群飞蚁，可能是白蚁分群",
      "检查墙根、车库木料有没有泥管",
      "院子里的火蚁窝趁早处理，小孩宠物别靠近",
      "做一次全屋除虫，问清楚保修多久",
    ],
    categories: ["pest", "lawn_fence"],
    shareTitle: "春季白蚁火蚁季：邻居推荐的除虫师傅",
  },
  {
    id: "ac",
    enabled: true,
    months: [5, 6],
    icon: "❄️",
    color: "#0284c7",
    title: "入夏前，空调检修一次",
    subtitle: "7 月师傅最忙最难约，趁现在保养，夏天不怕罢工",
    tips: [
      "换空调滤网（一般 1-3 个月一换）",
      "清洗室外机冷凝器，检查冷媒是否不足",
      "检查排水管有没有堵，防止天花板漏水",
      "空调超过 12-15 年，可以先问问换新的报价",
    ],
    categories: ["hvac"],
    shareTitle: "入夏前空调检修提醒：附邻居推荐的空调师傅",
  },
  {
    id: "hurricane",
    enabled: true,
    months: [6, 7, 8, 9],
    icon: "🌀",
    color: "#4338ca",
    title: "飓风季，提前做准备",
    subtitle: "6 月到 11 月是飓风季，屋顶、大树、发电机先检查",
    tips: [
      "检查屋顶有没有松动、缺瓦，排水槽清干净",
      "靠近房子的大树枝提前修剪",
      "备好发电机，请电工装好转换开关，千万别在室内开",
      "看一下房屋保险和洪水险（Flood 险要等 30 天生效）",
      "备水、手电、药品，记下疏散路线",
    ],
    categories: ["roof", "lawn_fence", "electrical", "finance_insurance"],
    shareTitle: "休斯顿飓风季准备清单：附邻居推荐的屋顶/电工/修树师傅",
  },
  {
    id: "heating",
    enabled: true,
    months: [10, 11],
    icon: "🔥",
    color: "#b45309",
    title: "天冷前，暖气检修一次",
    subtitle: "第一次开暖气有焦味、不出热风？趁降温前先检查",
    tips: [
      "换滤网，第一次开暖气有一点焦味属正常，持续就要查",
      "燃气炉检查点火和一氧化碳报警器",
      "热水器冲一下水垢，老化的考虑提前换",
      "门窗缝漏风的地方补一下，省电费",
    ],
    categories: ["hvac", "plumbing"],
    shareTitle: "降温前暖气检修提醒：附邻居推荐的空调暖气师傅",
  },
  {
    id: "insurance",
    enabled: true,
    months: [11, 12],
    icon: "🛡️",
    color: "#047857",
    title: "年底保险续保、年终税务规划",
    subtitle: "医保开放注册、房屋车险续保、年底前的节税安排",
    tips: [
      "医保开放注册一般 11 月 1 日开始，别错过截止日",
      "房屋险、车险到期前比一比价",
      "12 月 31 日前的捐款、退休账户供款可以节税",
      "有疑问先问会计师或保险经纪，别等到明年报税",
    ],
    categories: ["finance_insurance", "tax"],
    shareTitle: "年底保险续保和节税提醒：邻居推荐的保险/会计",
  },
];
