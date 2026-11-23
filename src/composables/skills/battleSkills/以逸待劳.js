/**
 * 金币技能：以逸待劳
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'

export function createExecuteYiYiDaiLao(gameStore) {
  return function executeYiYiDaiLao(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('以逸待劳', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 记录目标玩家当前金币数，用于计算本轮获得
    gameStore.yiyidl[caster.name] = {
      target: target.name,
      goldMark: target.gold
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '以逸待劳',
      `${caster.name}使用了以逸待劳，以逸待劳生效，对${target.name}根据出战城市数造成额外伤害，并抢走其本轮获得的金币`,
      `${caster.name}对 ${target.name} 使用了以逸待劳`
    )

    return {
      success: true,
      message: `对${target.name}使用了以逸待劳，根据其出战城市数+2000伤害，并抢走其本轮获得的金币`
    }
  }
}
