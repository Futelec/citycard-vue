/**
 * 金币技能：擒贼擒王
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteQinZeiQinWang(gameStore) {
  return function executeQinZeiQinWang(caster, target) {
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('擒贼擒王', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    if (!caster.battleModifiers) caster.battleModifiers = []

    caster.battleModifiers.push({
      type: 'attack_priority',
      value: 'highest_hp',
      duration: TUNE.qinZeiQinWang.duration
    })

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '擒贼擒王',
      `${caster.name}使用了擒贼擒王，本轮将优先攻击血量最高的城市`,
      `${caster.name}使用了擒贼擒王`
    )

    return {
      success: true,
      message: '本轮战斗将优先攻击血量最高的城市'
    }
  }
}
