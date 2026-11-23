/**
 * 金币技能：同归于尽
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteTongGuiYuJin(gameStore) {
  return function executeTongGuiYuJin(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('同归于尽', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    selfCity.modifiers = selfCity.modifiers || []
    selfCity.modifiers.push({
      type: 'mutual_destruction',
      duration: TUNE.tongGuiYuJin.duration
    })

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '同归于尽',
      `${caster.name}使用了同归于尽，${selfCity.name} 获得同归于尽效果，阵亡时将摧毁对方出战城市`,
      `${caster.name}对 ${selfCity.name} 使用了同归于尽`
    )

    return {
      success: true,
      message: `${selfCity.name} 获得同归于尽效果，阵亡时摧毁对方出战城市`
    }
  }
}
