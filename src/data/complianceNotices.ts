/**
 * Static disclosure copy. This file deliberately does not enable payment,
 * probability, pity, identity verification, or underage restriction logic.
 * Production operation must replace these placeholders with legally reviewed,
 * jurisdiction-specific text and a published version number.
 */
export const COMPLIANCE_NOTICES = {
  version: "draft-2026-08-06",
  probability: {
    title: "概率公示（声明草案）",
    effective: "尚未生效",
    content: [
      "游戏当前的秘匣仅用于本地演示，不提供付费购买或真实概率结算。",
      "正式开放随机获取内容前，将在补给站入口和详情页公示各稀有度、限定池、重复转换及概率变更记录。",
      "概率公示以服务端版本和生效时间为准；客户端仅展示，不参与概率或奖励判定。",
    ],
  },
  pity: {
    title: "保底机制（声明草案）",
    effective: "尚未生效",
    content: [
      "当前版本未启用保底计数、付费保底或抽取补偿。",
      "若后续启用，将明确公示计数范围、触发条件、跨卡池继承规则、重置条件和奖励内容。",
      "保底进度必须由服务端账户记录，客户端展示的任何数值均不构成最终结算依据。",
    ],
  },
  minors: {
    title: "未成年人保护（声明草案）",
    effective: "尚未生效",
    content: [
      "当前演示版本不包含充值、交易或付费随机内容，未启用实名与时长限制。",
      "正式运营前将按适用法律接入实名核验、未成年人时段与时长限制、消费限额、监护人申诉及内容分级能力。",
      "在保护能力未正式启用前，不开放面向未成年人的商业化功能。",
    ],
  },
  terms: {
    title: "用户协议（声明草案）",
    effective: "尚未生效",
    content: [
      "本项目当前为开发演示，未构成正式线上服务、付费商品或对外运营承诺。",
      "正式上线前将发布经审阅的用户协议，明确账户、虚拟财产、行为规范、违规处理、服务变更和争议处理条款。",
    ],
  },
  privacy: {
    title: "隐私政策（声明草案）",
    effective: "尚未生效",
    content: [
      "开发演示阶段仅在本机保存必要的游戏进度；启用云端后会另行说明数据类型、处理目的、保存期限、共享对象与用户权利。",
      "正式上线前将提供隐私政策、数据导出/删除入口以及联系渠道，并在收集个人信息前取得必要同意。",
    ],
  },
} as const;

export type ComplianceNoticeKey = keyof Omit<typeof COMPLIANCE_NOTICES, "version">;

export const COMPLIANCE_NOTICE_LIST = [
  COMPLIANCE_NOTICES.probability,
  COMPLIANCE_NOTICES.pity,
  COMPLIANCE_NOTICES.minors,
  COMPLIANCE_NOTICES.terms,
  COMPLIANCE_NOTICES.privacy,
] as const;
