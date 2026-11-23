/**
 * 金币技能：越战越勇
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteYueZhanYueYong(gameStore) {
  return function executeYueZhanYueYong(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // 获取城市名称
    const cityName = selfCity.name
    if (!caster.cities[cityName]) {
      return { success: false, message: '城市不存在' }
    }

    if (!caster.streaks) caster.streaks = {}
    const streak = caster.streaks[cityName] || 0

    if (streak === 0) {
      return {
        success: false,
        message: `${selfCity.name} 上一轮未出战，无法使用越战越勇`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('越战越勇', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    selfCity.modifiers = selfCity.modifiers || []
    selfCity.modifiers.push({
      type: 'ignore_fatigue',
      duration: TUNE.yueZhanYueYong.duration
    })

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '越战越勇',
      `${caster.name}使用了越战越勇，${selfCity.name} 获得越战越勇效果，本轮战斗力不减半`,
      `${caster.name}对 ${selfCity.name} 使用了越战越勇`
    )

    return {
      success: true,
      message: `${selfCity.name} 本轮战斗力不受疲劳影响`
    }
  }
}
