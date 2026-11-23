/**
 * 金币技能：吸引攻击
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteXiYinGongJi(gameStore) {
  return function executeXiYinGongJi(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('吸引攻击', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    selfCity.modifiers = selfCity.modifiers || []
    selfCity.modifiers.push({
      type: 'attract_damage',
      duration: TUNE.xiYinGongJi.duration
    })

    // 仅私密日志（公开日志在battle2P中战斗计算时输出，避免提前暴露）
    gameStore.addPrivateLog(caster.name, `${caster.name}对 ${selfCity.name} 使用了吸引攻击`)

    return {
      success: true,
      message: `${selfCity.name} 将吸引对手本轮全部伤害`,
      hidePublicLog: true  // 战斗技能效果在battle2P中公开，此处不公开
    }
  }
}
