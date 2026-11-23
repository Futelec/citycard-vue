/**
 * 金币技能：欲擒故纵
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'

export function createExecuteYuQinGuZong(gameStore) {
  return function executeYuQinGuZong(caster, target, targetCity) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    if (!targetCity) {
      return { success: false, message: '未选择目标城市' }
    }

    // 检查城市是否为出战城市（roster中）
    const targetRoster = gameStore.roster[target.name] || []
    const targetCityKey = targetCity.name

    if (!targetRoster.includes(targetCityKey)) {
      return {
        success: false,
        message: '目标城市不是出战城市'
      }
    }

    // 检查是否为中心城市
    if (targetCity.isCenter) {
      return {
        success: false,
        message: '不能对中心城市使用欲擒故纵'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('欲擒故纵', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 创建陷阱标记
    gameStore.yqgzMarks.push({
      player: caster.name,
      target: target.name,
      cityName: targetCity.name,
      roundCreated: gameStore.currentRound
    })

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '欲擒故纵',
      `${caster.name}使用了欲擒故纵，欲擒故纵生效，对${target.name}的城市设置陷阱，双方本轮退兵`,
      `你对${target.name}的${targetCity.name}使用了欲擒故纵`
    )

    return {
      success: true,
      message: `对${target.name}的${targetCity.name}设置了陷阱，双方本轮退兵`
    }
  }
}
