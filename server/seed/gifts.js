/**
 * 种子礼物数据 —— 全部为手工整理的品类参考，不包含任何第三方商品图片、
 * 不绑定具体商家和商品链接。价格只用于表达品类的大致价位，非实时售价。
 *
 * tags 里填写的是标签路径；父级标签会自动补齐。
 */
const CATEGORY_GRADIENTS = {
  运动: ['#34d399', '#047857'],
  运动户外: ['#34d399', '#047857'],
  手办: ['#c084fc', '#7c3aed'],
  潮玩手办: ['#c084fc', '#7c3aed'],
  书籍: ['#60a5fa', '#1d4ed8'],
  书籍文具: ['#60a5fa', '#1d4ed8'],
  香水: ['#fbbf24', '#b45309'],
  美妆香氛: ['#fbbf24', '#b45309'],
  实用小物: ['#fb923c', '#c2410c'],
  居家日用: ['#a3e635', '#4d7c0f'],
  数码: ['#22d3ee', '#0e7490'],
  数码电子: ['#22d3ee', '#0e7490'],
  美食: ['#f87171', '#b91c1c'],
  美食饮品: ['#f87171', '#b91c1c'],
  居家: ['#a3e635', '#4d7c0f'],
  户外: ['#2dd4bf', '#0f766e'],
  音乐: ['#818cf8', '#4338ca'],
  手工: ['#f472b6', '#be185d'],
  配饰穿搭: ['#f472b6', '#be185d']
}

export const SEED_GIFTS = [
  {
    name: '比赛级足球',
    emoji: '⚽',
    category: '运动',
    fitFor: '每周踢球的死党',
    reason: '耐磨，脚感扎实，比送球衣更实用。',
    priceMin: 200,
    priceMax: 400,
    tags: ['运动/足球', '风格/实用派']
  },
  {
    name: '室内外两用篮球',
    emoji: '🏀',
    category: '运动',
    fitFor: '常去球场的朋友',
    reason: '手感稳定，室内外都能打，使用率很高。',
    priceMin: 150,
    priceMax: 300,
    tags: ['运动/篮球', '风格/实用派']
  },
  {
    name: '初学者网球拍',
    emoji: '🎾',
    category: '运动',
    fitFor: '刚入坑网球的人',
    reason: '拍面大、容错高，入门阶段不容易被劝退。',
    priceMin: 180,
    priceMax: 350,
    tags: ['运动/网球', '风格/陪伴感']
  },
  {
    name: '轻量羽毛球拍',
    emoji: '🏸',
    category: '运动',
    fitFor: '周末约球的搭子',
    reason: '挥拍轻快，双打也不累手，约球就能用上。',
    priceMin: 200,
    priceMax: 400,
    tags: ['运动/羽毛球', '风格/实用派']
  },
  {
    name: '加厚瑜伽垫',
    emoji: '🧘',
    category: '运动',
    fitFor: '喜欢居家拉伸的同事',
    reason: '防滑加厚，铺开就能练，收起来不占地方。',
    priceMin: 80,
    priceMax: 180,
    tags: ['运动/健身', '实用小物/居家小物', '风格/高性价比']
  },
  {
    name: '可调节哑铃',
    emoji: '🏋️',
    category: '运动',
    fitFor: '想在家练力量的朋友',
    reason: '一对顶多对，重量可调，长期都用得上。',
    priceMin: 300,
    priceMax: 500,
    tags: ['运动/健身', '风格/实用派']
  },
  {
    name: '运动手环',
    emoji: '⌚',
    category: '数码',
    fitFor: '刚开始跑步的人',
    reason: '记录心率和配速，比空喊加油更有用。',
    priceMin: 200,
    priceMax: 400,
    tags: ['运动/跑步', '数码/配件', '风格/实用派']
  },
  {
    name: '专业跑步袜',
    emoji: '🧦',
    category: '运动',
    fitFor: '跑马拉松的朋友',
    reason: '减少水泡，是消耗品，但每次穿都会想起你。',
    priceMin: 60,
    priceMax: 120,
    tags: ['运动/跑步', '风格/高性价比']
  },
  {
    name: '大容量运动水壶',
    emoji: '🥤',
    category: '运动',
    fitFor: '健身房常客',
    reason: '一次装够，刻度清楚，顺便提醒多喝水。',
    priceMin: 60,
    priceMax: 150,
    tags: ['运动/健身', '风格/实用派']
  },
  {
    name: '轻便运动腰包',
    emoji: '🎒',
    category: '运动',
    fitFor: '习惯夜跑的朋友',
    reason: '手机钥匙有处放，跑起来不晃。',
    priceMin: 70,
    priceMax: 160,
    tags: ['运动/跑步', '风格/实用派']
  },
  {
    name: '治愈系毛绒玩偶',
    emoji: '🧸',
    category: '手办',
    fitFor: '最近压力很大的朋友',
    reason: '抱起来很软，放在床头就是一种陪伴。',
    priceMin: 80,
    priceMax: 200,
    tags: ['手办/毛绒玩偶', '风格/陪伴感']
  },
  {
    name: '拼装机器人模型',
    emoji: '🤖',
    category: '手办',
    fitFor: '喜欢动手的人',
    reason: '拼装过程本身就有乐趣，成品能摆很久。',
    priceMin: 200,
    priceMax: 450,
    tags: ['手办/模型', '风格/收藏向']
  },
  {
    name: '动漫角色手办',
    emoji: '🦸',
    category: '手办',
    fitFor: '追番多年的同好',
    reason: '细节在线，摆在桌上就是现成的话题。',
    priceMin: 250,
    priceMax: 500,
    tags: ['手办/动漫手办', '风格/收藏向']
  },
  {
    name: '盲盒一套',
    emoji: '🎁',
    category: '手办',
    fitFor: '喜欢小惊喜的朋友',
    reason: '拆盒的快乐大于结果，很适合当气氛礼物。',
    priceMin: 150,
    priceMax: 350,
    tags: ['手办/盲盒', '风格/仪式感']
  },
  {
    name: '木质立体拼图',
    emoji: '🧩',
    category: '手办',
    fitFor: '喜欢安静独处的人',
    reason: '不用屏幕，一个下午不知不觉就过去了。',
    priceMin: 90,
    priceMax: 220,
    tags: ['手办/模型', '风格/陪伴感']
  },
  {
    name: '复古合金小火车',
    emoji: '🚂',
    category: '手办',
    fitFor: '有点怀旧情结的朋友',
    reason: '有分量的小摆件，放在书架上一眼就能看到。',
    priceMin: 120,
    priceMax: 280,
    tags: ['手办/模型', '风格/小众']
  },
  {
    name: '桌面摆件盲袋',
    emoji: '📦',
    category: '手办',
    fitFor: '工位需要一点乐趣的人',
    reason: '不贵，但每天抬头都能笑一下。',
    priceMin: 50,
    priceMax: 120,
    tags: ['手办/盲盒', '风格/高性价比']
  },
  {
    name: '解压捏捏乐',
    emoji: '🪀',
    category: '手办',
    fitFor: '容易焦虑的朋友',
    reason: '手感解压，开会时也能悄悄捏两下。',
    priceMin: 30,
    priceMax: 80,
    tags: ['手办/毛绒玩偶', '风格/陪伴感']
  },
  {
    name: '年度小说精选',
    emoji: '📚',
    category: '书籍',
    fitFor: '喜欢读故事的人',
    reason: '好读不晦涩，适合睡前翻几页。',
    priceMin: 60,
    priceMax: 150,
    tags: ['书籍/小说', '风格/陪伴感']
  },
  {
    name: '非虚构佳作',
    emoji: '📖',
    category: '书籍',
    fitFor: '爱思考的朋友',
    reason: '有信息量也有观点，读完能聊很久。',
    priceMin: 50,
    priceMax: 120,
    tags: ['书籍/非虚构', '风格/实用派']
  },
  {
    name: '旅行随笔集',
    emoji: '🗺️',
    category: '书籍',
    fitFor: '暂时出不了远门的人',
    reason: '文字带路，先在心里出发一趟。',
    priceMin: 45,
    priceMax: 100,
    tags: ['书籍/非虚构', '风格/仪式感']
  },
  {
    name: '插画漫画套装',
    emoji: '🎨',
    category: '书籍',
    fitFor: '视觉系朋友',
    reason: '图多字少，随手翻也能获得快乐。',
    priceMin: 80,
    priceMax: 200,
    tags: ['书籍/漫画', '风格/陪伴感']
  },
  {
    name: '手账本礼盒',
    emoji: '📓',
    category: '实用小物',
    fitFor: '喜欢记录生活的人',
    reason: '纸感好，还配了贴纸，打开就想写点什么。',
    priceMin: 70,
    priceMax: 160,
    tags: ['书籍', '实用小物/办公', '风格/仪式感']
  },
  {
    name: '思维认知书单',
    emoji: '🧠',
    category: '书籍',
    fitFor: '处在职场上升期的朋友',
    reason: '不灌鸡汤，讲方法和结构，能直接拿去用。',
    priceMin: 90,
    priceMax: 220,
    tags: ['书籍/非虚构', '风格/实用派']
  },
  {
    name: '园艺入门图鉴',
    emoji: '🌱',
    category: '书籍',
    fitFor: '刚搬新家的朋友',
    reason: '从养活一盆开始，慢慢把日子过出生活气。',
    priceMin: 60,
    priceMax: 140,
    tags: ['书籍/非虚构', '居家/绿植', '风格/陪伴感']
  },
  {
    name: '家常菜谱书',
    emoji: '🍳',
    category: '书籍',
    fitFor: '刚开始学做饭的人',
    reason: '步骤清楚，失败率低，买回家立刻能用。',
    priceMin: 50,
    priceMax: 120,
    tags: ['书籍/非虚构', '风格/实用派']
  },
  {
    name: '花香调淡香水',
    emoji: '🌸',
    category: '香水',
    fitFor: '喜欢清爽香气的朋友',
    reason: '不挑季节，日常喷也不压人。',
    priceMin: 200,
    priceMax: 400,
    tags: ['香水/花香调', '风格/仪式感']
  },
  {
    name: '木质调香水',
    emoji: '🌲',
    category: '香水',
    fitFor: '气质偏沉稳的人',
    reason: '尾调温暖，秋冬用尤其合适。',
    priceMin: 300,
    priceMax: 500,
    tags: ['香水/木质调', '风格/小众']
  },
  {
    name: '清新柑橘香',
    emoji: '🍋',
    category: '香水',
    fitFor: '不喜欢浓香的人',
    reason: '干净利落，通勤场合也能用。',
    priceMin: 150,
    priceMax: 350,
    tags: ['香水/清新调', '风格/实用派']
  },
  {
    name: '香薰蜡烛',
    emoji: '🕯️',
    category: '居家',
    fitFor: '喜欢居家氛围的人',
    reason: '点起来房间气氛就变了，适合周末慢慢待着。',
    priceMin: 80,
    priceMax: 200,
    tags: ['居家/香薰', '风格/仪式感']
  },
  {
    name: '无火香薰',
    emoji: '🧴',
    category: '居家',
    fitFor: '租房、不想点火的人',
    reason: '插上藤条就能用，安全又省心。',
    priceMin: 100,
    priceMax: 260,
    tags: ['居家/香薰', '风格/实用派']
  },
  {
    name: '香水小样礼盒',
    emoji: '🎀',
    category: '香水',
    fitFor: '想试香又怕买错的人',
    reason: '一次试多种，找到本命香再买正装。',
    priceMin: 100,
    priceMax: 250,
    tags: ['香水/花香调', '香水/清新调', '风格/高性价比']
  },
  {
    name: '保温随行杯',
    emoji: '☕',
    category: '实用小物',
    fitFor: '每天通勤带咖啡的人',
    reason: '保温够久，杯口好清洗，不用供着。',
    priceMin: 100,
    priceMax: 250,
    tags: ['实用小物/通勤', '风格/实用派']
  },
  {
    name: '羊绒混纺围巾',
    emoji: '🧣',
    category: '实用小物',
    fitFor: '冬天特别怕冷的朋友',
    reason: '轻但暖，颜色百搭，不挑穿衣风格。',
    priceMin: 150,
    priceMax: 350,
    tags: ['实用小物/通勤', '风格/仪式感']
  },
  {
    name: '帆布托特包',
    emoji: '👜',
    category: '实用小物',
    fitFor: '出门东西总是很多的人',
    reason: '能装耐造，上班买菜都不违和。',
    priceMin: 70,
    priceMax: 180,
    tags: ['实用小物/通勤', '风格/高性价比']
  },
  {
    name: '皮质钥匙包',
    emoji: '🔑',
    category: '实用小物',
    fitFor: '钥匙总在包里找不到的人',
    reason: '钥匙有了固定位置，出门少翻一次包。',
    priceMin: 60,
    priceMax: 150,
    tags: ['实用小物/通勤', '风格/实用派']
  },
  {
    name: '护眼台灯',
    emoji: '💡',
    category: '实用小物',
    fitFor: '经常加班看书的人',
    reason: '光线柔和，久看不刺眼，桌面也显干净。',
    priceMin: 150,
    priceMax: 350,
    tags: ['实用小物/居家小物', '风格/实用派']
  },
  {
    name: '睡眠袜套装',
    emoji: '🧦',
    category: '实用小物',
    fitFor: '手脚容易凉的人',
    reason: '睡前穿一双，是那种很细小的照顾。',
    priceMin: 40,
    priceMax: 100,
    tags: ['实用小物/居家小物', '风格/陪伴感']
  },
  {
    name: '电动牙刷',
    emoji: '🪥',
    category: '实用小物',
    fitFor: '想升级日常小物的人',
    reason: '每天用两次，是存在感很高的礼物。',
    priceMin: 200,
    priceMax: 400,
    tags: ['实用小物/居家小物', '风格/实用派']
  },
  {
    name: '旅行收纳包',
    emoji: '🧳',
    category: '实用小物',
    fitFor: '经常出差的朋友',
    reason: '行李分区清楚，找东西不用翻箱倒柜。',
    priceMin: 90,
    priceMax: 200,
    tags: ['实用小物/通勤', '风格/实用派']
  },
  {
    name: '轻量折叠伞',
    emoji: '🌂',
    category: '实用小物',
    fitFor: '包里永远缺一把伞的人',
    reason: '轻到愿意每天带，防晒也够用。',
    priceMin: 50,
    priceMax: 120,
    tags: ['实用小物/通勤', '风格/高性价比']
  },
  {
    name: '触屏保暖手套',
    emoji: '🧤',
    category: '实用小物',
    fitFor: '冬天骑车的朋友',
    reason: '不用摘手套也能回消息，细节很加分。',
    priceMin: 80,
    priceMax: 180,
    tags: ['实用小物/通勤', '风格/实用派']
  },
  {
    name: '一人食茶具',
    emoji: '🫖',
    category: '实用小物',
    fitFor: '喜欢把生活慢下来的人',
    reason: '份量刚好，一个人也能有仪式感。',
    priceMin: 120,
    priceMax: 300,
    tags: ['实用小物/居家小物', '风格/仪式感']
  },
  {
    name: '真丝眼罩',
    emoji: '🛏️',
    category: '实用小物',
    fitFor: '睡眠很浅的朋友',
    reason: '遮光贴合，出差在外也能睡好一点。',
    priceMin: 80,
    priceMax: 200,
    tags: ['实用小物/居家小物', '风格/陪伴感']
  },
  {
    name: '降噪耳机',
    emoji: '🎧',
    category: '数码',
    fitFor: '通勤时间很长的人',
    reason: '地铁里能安静下来，属于用过就回不去的类型。',
    priceMin: 300,
    priceMax: 500,
    tags: ['数码/音频', '风格/实用派']
  },
  {
    name: '拍立得相机',
    emoji: '📷',
    category: '数码',
    fitFor: '喜欢记录聚会的人',
    reason: '拍完立刻拿到照片，很适合一起玩。',
    priceMin: 500,
    priceMax: 800,
    tags: ['数码/影像', '风格/仪式感']
  },
  {
    name: '便携充电宝',
    emoji: '💾',
    category: '数码',
    fitFor: '手机电量总不够用的人',
    reason: '小巧能带上飞机，出门多一份安心。',
    priceMin: 100,
    priceMax: 200,
    tags: ['数码/配件', '风格/实用派']
  },
  {
    name: '机械键盘',
    emoji: '⌨️',
    category: '数码',
    fitFor: '每天要敲很多字的人',
    reason: '手感提升明显，工作幸福感会直接拉满。',
    priceMin: 300,
    priceMax: 500,
    tags: ['数码/配件', '风格/实用派']
  },
  {
    name: '人体工学鼠标',
    emoji: '🖱️',
    category: '数码',
    fitFor: '手腕容易酸的人',
    reason: '握姿更自然，长时间用会舒服很多。',
    priceMin: 150,
    priceMax: 300,
    tags: ['数码/配件', '风格/实用派']
  },
  {
    name: '复古游戏掌机',
    emoji: '🎮',
    category: '数码',
    fitFor: '有童年游戏记忆的人',
    reason: '一起打一局，比聊天更快回到从前。',
    priceMin: 300,
    priceMax: 500,
    tags: ['数码/游戏', '风格/陪伴感']
  },
  {
    name: '手工巧克力礼盒',
    emoji: '🍫',
    category: '美食',
    fitFor: '喜欢甜食的朋友',
    reason: '可可味浓，不齁甜，包装也体面。',
    priceMin: 100,
    priceMax: 250,
    tags: ['美食/甜品', '风格/仪式感']
  },
  {
    name: '曲奇饼干礼盒',
    emoji: '🍪',
    category: '美食',
    fitFor: '办公室下午茶搭子',
    reason: '分着吃最合适，不会放到过期。',
    priceMin: 60,
    priceMax: 150,
    tags: ['美食/甜品', '风格/高性价比']
  },
  {
    name: '精品茶叶礼盒',
    emoji: '🍵',
    category: '美食',
    fitFor: '爱喝茶的朋友或长辈',
    reason: '耐泡，香气干净，属于不容易出错的礼物。',
    priceMin: 150,
    priceMax: 350,
    tags: ['美食/茶饮', '风格/仪式感']
  },
  {
    name: '单品咖啡豆',
    emoji: '☕',
    category: '美食',
    fitFor: '每天手冲咖啡的人',
    reason: '产地风味清楚，比送杯子更贴近他的爱好。',
    priceMin: 80,
    priceMax: 180,
    tags: ['美食/咖啡', '风格/小众']
  },
  {
    name: '蜂蜜伴手礼',
    emoji: '🍯',
    category: '美食',
    fitFor: '想送点健康的人',
    reason: '日常能用得上，包装也不浮夸。',
    priceMin: 60,
    priceMax: 140,
    tags: ['美食/甜品', '风格/实用派']
  },
  {
    name: '果酒礼盒',
    emoji: '🍶',
    category: '美食',
    fitFor: '喜欢微醺的朋友',
    reason: '度数低，聚会时大家都能喝一点。',
    priceMin: 120,
    priceMax: 300,
    tags: ['美食/酒饮', '风格/仪式感']
  },
  {
    name: '桌面绿植套装',
    emoji: '🪴',
    category: '居家',
    fitFor: '工位有点单调的人',
    reason: '多一点绿色，工作间隙抬头能放松一下。',
    priceMin: 50,
    priceMax: 130,
    tags: ['居家/绿植', '风格/陪伴感']
  },
  {
    name: '收纳篮三件套',
    emoji: '🧺',
    category: '居家',
    fitFor: '刚搬家的人',
    reason: '杂物有了归处，房间立刻清爽不少。',
    priceMin: 80,
    priceMax: 200,
    tags: ['居家/家纺', '风格/实用派']
  },
  {
    name: '针织盖毯',
    emoji: '🛋️',
    category: '居家',
    fitFor: '喜欢窝在沙发上的人',
    reason: '触感软，空调房和冬天都用得上。',
    priceMin: 120,
    priceMax: 280,
    tags: ['居家/家纺', '风格/陪伴感']
  },
  {
    name: '轻量露营灯',
    emoji: '⛺',
    category: '户外',
    fitFor: '周末去露营的朋友',
    reason: '亮度可调，挂在帐篷里氛围刚刚好。',
    priceMin: 100,
    priceMax: 250,
    tags: ['户外/露营', '风格/仪式感']
  },
  {
    name: '户外折叠椅',
    emoji: '🧗',
    category: '户外',
    fitFor: '常去草地野餐的人',
    reason: '收起来很小，坐着比垫子舒服得多。',
    priceMin: 150,
    priceMax: 300,
    tags: ['户外/露营', '风格/实用派']
  },
  {
    name: '轻量徒步背包',
    emoji: '🎒',
    category: '户外',
    fitFor: '计划去徒步的人',
    reason: '背负透气，一日线路完全够用。',
    priceMin: 300,
    priceMax: 500,
    tags: ['户外/徒步', '风格/实用派']
  },
  {
    name: '尤克里里',
    emoji: '🎸',
    category: '音乐',
    fitFor: '想学乐器又怕难的人',
    reason: '四根弦上手快，一周就能弹一首歌。',
    priceMin: 300,
    priceMax: 500,
    tags: ['音乐/乐器', '风格/陪伴感']
  },
  {
    name: '黑胶唱片',
    emoji: '🎼',
    category: '音乐',
    fitFor: '家里有唱机的朋友',
    reason: '实体唱片的仪式感，流媒体替代不了。',
    priceMin: 150,
    priceMax: 350,
    tags: ['音乐/唱片', '风格/收藏向']
  },
  {
    name: '手工编织材料包',
    emoji: '🧶',
    category: '手工',
    fitFor: '喜欢宅家动手的人',
    reason: '材料齐全，跟着视频就能做出来。',
    priceMin: 60,
    priceMax: 150,
    tags: ['手工/编织', '风格/陪伴感']
  },
  {
    name: '水彩画具套装',
    emoji: '🖌️',
    category: '手工',
    fitFor: '想开始画画的人',
    reason: '颜色够用，入门不用再东拼西凑。',
    priceMin: 100,
    priceMax: 250,
    tags: ['手工/绘画', '风格/仪式感']
  },
  {
    name: '足球训练背心',
    emoji: '🎽',
    category: '运动',
    fitFor: '常去训练的球友',
    reason: '分组对抗时一眼分清队友，轻便又透气。',
    priceMin: 60,
    priceMax: 120,
    tags: ['运动/足球', '风格/实用派']
  },
  {
    name: '守门员手套',
    emoji: '🧤',
    category: '运动',
    fitFor: '喜欢守门的朋友',
    reason: '掌面防滑，扑救时更有底气，冷门但贴心。',
    priceMin: 150,
    priceMax: 300,
    tags: ['运动/足球', '风格/小众']
  },
  {
    name: '球场主题桌面摆件',
    emoji: '🏟️',
    category: '手办',
    fitFor: '想把爱好摆在桌上的人',
    reason: '小尺寸球场模型，工作间隙看一眼就想起周末。',
    priceMin: 100,
    priceMax: 250,
    tags: ['运动/足球', '手办/模型', '风格/收藏向']
  },
  {
    name: '入门黑胶唱机',
    emoji: '🎵',
    category: '音乐',
    fitFor: '开始收唱片的朋友',
    reason: '一体式省去搭配，放在书架上本身就是一件家具。',
    priceMin: 800,
    priceMax: 1200,
    tags: ['音乐/唱片', '风格/仪式感']
  },
  {
    name: '家用半自动咖啡机',
    emoji: '☕',
    category: '美食',
    fitFor: '每天离不开咖啡的人',
    reason: '早上省下排队时间，周末也能慢慢做一杯。',
    priceMin: 800,
    priceMax: 1500,
    tags: ['美食/咖啡', '风格/实用派']
  },
  {
    name: '运动袜毛巾礼盒',
    emoji: '🧦',
    category: '运动户外',
    fitFor: '经常跑步或健身的朋友',
    reason: '袜子毛巾都是会反复用的消耗品，礼盒装比单送更完整。',
    priceMin: 80,
    priceMax: 180,
    tags: ['运动/跑步', '风格/实用派']
  },
  {
    name: '户外野餐垫',
    emoji: '🧺',
    category: '运动户外',
    fitFor: '喜欢周末去公园和露营的人',
    reason: '折叠后不占地方，铺开就能坐，适合把见面变成一次小出游。',
    priceMin: 80,
    priceMax: 200,
    tags: ['户外/露营', '风格/仪式感']
  },
  {
    name: '蓝牙音箱',
    emoji: '🔊',
    category: '数码电子',
    fitFor: '喜欢在家放歌、聚会的人',
    reason: '比手机外放更有氛围，露营、做饭、洗澡都能用。',
    priceMin: 150,
    priceMax: 400,
    tags: ['数码/音频', '风格/仪式感']
  },
  {
    name: '护手霜礼盒',
    emoji: '🧴',
    category: '美妆香氛',
    fitFor: '手容易干、在意日常护理的人',
    reason: '实用度高，礼盒装适合送同事和朋友，不容易踩雷。',
    priceMin: 60,
    priceMax: 150,
    tags: []
  },
  {
    name: '口红经典色号礼盒',
    emoji: '💄',
    category: '美妆香氛',
    fitFor: '平时会化妆的朋友或恋人',
    reason: '经典色号比冷门色更稳，礼盒适合作为有仪式感的小礼物。',
    priceMin: 150,
    priceMax: 350,
    tags: []
  },
  {
    name: '乐高创意系列',
    emoji: '🧱',
    category: '潮玩手办',
    fitFor: '喜欢动手拼搭、收藏模型的人',
    reason: '拼装过程本身就是陪伴，完成后还能摆在桌上。',
    priceMin: 200,
    priceMax: 500,
    tags: ['手办/模型', '风格/收藏向']
  },
  {
    name: '游戏周边小夜灯',
    emoji: '🌙',
    category: '潮玩手办',
    fitFor: '喜欢游戏、桌面需要一点氛围的人',
    reason: '既是周边也是实用小灯，放在工位或床头都合适。',
    priceMin: 80,
    priceMax: 200,
    tags: ['手办/模型', '风格/陪伴感']
  },
  {
    name: '设计款咖啡杯',
    emoji: '☕',
    category: '居家日用',
    fitFor: '每天喝咖啡、在意杯子颜值的人',
    reason: '比普通杯子多一点设计感，日常使用频率高。',
    priceMin: 80,
    priceMax: 200,
    tags: ['实用小物/居家小物', '风格/仪式感']
  },
  {
    name: '钢笔礼盒',
    emoji: '🖋️',
    category: '书籍文具',
    fitFor: '经常写字、做手账或刚入职的人',
    reason: '有仪式感也实用，适合送给喜欢记录生活的朋友。',
    priceMin: 100,
    priceMax: 300,
    tags: ['实用小物/办公', '风格/仪式感']
  },
  {
    name: '喜欢的书 + 手写卡片',
    emoji: '📖',
    category: '书籍文具',
    fitFor: '喜欢阅读、重视心意的人',
    reason: '书是内容，手写卡片是心意，比直接买一本更特别。',
    priceMin: 50,
    priceMax: 120,
    tags: ['书籍', '风格/仪式感']
  },
  {
    name: '零食大礼包',
    emoji: '🍿',
    category: '美食饮品',
    fitFor: '爱吃零食的朋友、办公室同事',
    reason: '选择多、分享方便，适合预算不高但想有点热闹的场合。',
    priceMin: 60,
    priceMax: 150,
    tags: ['美食/甜品', '风格/高性价比']
  },
  {
    name: '奶茶/咖啡礼盒',
    emoji: '🧋',
    category: '美食饮品',
    fitFor: '每天离不开奶茶或咖啡的人',
    reason: '把日常的小习惯变成礼物，实用又有被记住的感觉。',
    priceMin: 80,
    priceMax: 200,
    tags: ['美食/茶饮', '美食/咖啡', '风格/仪式感']
  },
  {
    name: '本地烘焙生日蛋糕券',
    emoji: '🎂',
    category: '美食饮品',
    fitFor: '想送蛋糕但怕买错口味的人',
    reason: '让对方自己选口味和取货时间，比直接订蛋糕更灵活。',
    priceMin: 100,
    priceMax: 300,
    tags: ['美食/甜品', '风格/仪式感']
  },
  {
    name: '轻奢入门银项链/手链',
    emoji: '📿',
    category: '配饰穿搭',
    fitFor: '喜欢简约首饰的朋友或恋人',
    reason: '日常能戴，价格比大牌友好，适合作为纪念日小礼物。',
    priceMin: 150,
    priceMax: 400,
    tags: []
  },
  {
    name: '基础款板鞋/运动鞋',
    emoji: '👟',
    category: '配饰穿搭',
    fitFor: '缺一双百搭鞋、经常走路的人',
    reason: '使用频率高，但尺码和款式偏好明显，最好确认对方需求。',
    priceMin: 200,
    priceMax: 500,
    tags: []
  }
].map((gift, index) => {
  const [from, to] = CATEGORY_GRADIENTS[gift.category]
  return {
    ...gift,
    gradientFrom: from,
    gradientTo: to,
    sortOrder: index + 1
  }
})
