/**
 * 礼物目录的“送礼场景”字段。
 *
 * 目前礼物数据以品类为主，还没有人工逐条维护对象和场合，
 * 这里先按品类 + 适合人群文案做一份保守映射；后续可以把
 * 映射迁移到 gifts 表，逐条人工校正。
 */

export const RECIPIENT_OPTIONS = [
  '朋友',
  '恋人',
  '父母',
  '长辈',
  '同事',
  '孩子',
  '自己'
]

export const OCCASION_OPTIONS = ['生日', '节日', '纪念日', '日常惊喜']

export const INTEREST_OPTIONS = [
  '运动户外',
  '数码电子',
  '美妆香氛',
  '潮玩手办',
  '居家日用',
  '书籍文具',
  '美食饮品',
  '配饰穿搭'
]

const CATEGORY_RECIPIENTS = {
  运动: ['朋友', '恋人', '自己'],
  运动户外: ['朋友', '恋人', '自己'],
  手办: ['朋友', '恋人', '自己', '孩子'],
  潮玩手办: ['朋友', '恋人', '自己', '孩子'],
  书籍: ['朋友', '父母', '自己', '孩子'],
  书籍文具: ['朋友', '父母', '自己', '孩子'],
  香水: ['朋友', '恋人', '父母'],
  美妆香氛: ['朋友', '恋人', '父母'],
  实用小物: ['朋友', '父母', '同事', '恋人'],
  居家日用: ['朋友', '父母', '同事', '恋人'],
  数码: ['朋友', '恋人', '自己'],
  数码电子: ['朋友', '恋人', '自己'],
  美食: ['朋友', '父母', '长辈', '同事'],
  美食饮品: ['朋友', '父母', '长辈', '同事'],
  居家: ['朋友', '父母', '恋人', '同事'],
  户外: ['朋友', '恋人', '自己'],
  音乐: ['朋友', '恋人', '自己'],
  手工: ['朋友', '恋人', '父母', '孩子'],
  配饰穿搭: ['朋友', '恋人', '父母', '同事']
}

const CATEGORY_OCCASIONS = {
  运动: [],
  运动户外: [],
  手办: ['纪念日'],
  潮玩手办: ['纪念日'],
  书籍: ['感谢'],
  书籍文具: ['感谢'],
  香水: ['纪念日'],
  美妆香氛: ['纪念日'],
  实用小物: ['感谢', '乔迁'],
  居家日用: ['纪念日', '感谢', '乔迁'],
  数码: ['纪念日'],
  数码电子: ['纪念日'],
  美食: ['感谢', '乔迁'],
  美食饮品: ['感谢', '乔迁'],
  居家: ['纪念日', '感谢', '乔迁'],
  户外: ['纪念日'],
  音乐: ['纪念日'],
  手工: ['纪念日', '感谢'],
  配饰穿搭: ['纪念日']
}

const CATEGORY_INTERESTS = {
  运动: '运动户外',
  运动户外: '运动户外',
  手办: '潮玩手办',
  潮玩手办: '潮玩手办',
  书籍: '书籍文具',
  书籍文具: '书籍文具',
  香水: '美妆香氛',
  美妆香氛: '美妆香氛',
  实用小物: '居家日用',
  居家日用: '居家日用',
  数码: '数码电子',
  数码电子: '数码电子',
  美食: '美食饮品',
  美食饮品: '美食饮品',
  居家: '居家日用',
  户外: '运动户外',
  音乐: '潮玩手办',
  手工: '书籍文具',
  配饰穿搭: '配饰穿搭'
}

const ELDER_HINTS = /长辈|父母|妈妈|爸爸|家人|老人|老师/
const COLLEAGUE_HINTS = /同事|工位|办公|通勤|下午茶|领导|客户/
const PARTNER_HINTS = /恋人|女友|男友|对象|老婆|老公|伴侣/
const CHILD_HINTS = /孩子|小朋友|学生|儿童/
const ELDER_GIFT_HINTS = /茶叶|蜂蜜|保温|围巾|护眼|睡眠|茶具|绿植|盖毯|咖啡机|健康/

export function getGiftFacets(gift) {
  const category = gift.category
  const fitFor = gift.fit_for ?? gift.fitFor ?? ''
  const name = gift.name ?? ''

  const recipients = new Set(CATEGORY_RECIPIENTS[category] ?? ['朋友'])
  const occasions = new Set([
    '生日',
    '节日',
    '日常惊喜',
    ...(CATEGORY_OCCASIONS[category] ?? [])
  ])

  if (COLLEAGUE_HINTS.test(fitFor)) recipients.add('同事')
  if (ELDER_HINTS.test(fitFor)) recipients.add('长辈')
  if (PARTNER_HINTS.test(fitFor)) recipients.add('恋人')
  if (CHILD_HINTS.test(fitFor)) recipients.add('孩子')
  if (ELDER_GIFT_HINTS.test(name)) {
    recipients.add('长辈')
    recipients.add('父母')
  }
  if (/通勤|办公|工位/.test(name)) recipients.add('同事')

  if (CATEGORY_OCCASIONS[category]?.includes('感谢')) {
    occasions.add('感谢')
  }
  if (CATEGORY_RECIPIENTS[category]?.includes('父母')) {
    occasions.add('感谢')
  }

  const interests = new Set([CATEGORY_INTERESTS[category] ?? '居家日用'])
  if (/围巾|托特包|钥匙包|手套|项链|手链|板鞋|运动鞋/.test(name)) {
    interests.add('配饰穿搭')
  }
  if (/护手霜|口红|香水/.test(name)) {
    interests.add('美妆香氛')
  }
  if (/咖啡机|咖啡杯|香薰|盖毯|收纳|绿植/.test(name)) {
    interests.add('居家日用')
  }
  if (/手办|盲盒|模型|乐高|小夜灯/.test(name)) {
    interests.add('潮玩手办')
  }
  if (/球|拍|露营|野餐|运动|健身|跑步/.test(name)) {
    interests.add('运动户外')
  }
  if (/耳机|音箱|相机|手环|键盘|鼠标|掌机|充电宝/.test(name)) {
    interests.add('数码电子')
  }

  return {
    recipients: [...recipients],
    occasions: [...occasions],
    interests: [...interests]
  }
}
