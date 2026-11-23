/**
 * 金币技能：玉碎瓦全
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'

import { getCityByName } from './_helpers'

export function createExecuteYuSuiWaQuan(gameStore) {
  return function executeYuSuiWaQuan(caster, target, targetCityName) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    if (!targetCityName) {
      return { success: false, message: '未选择目标城市' }
    }

    const targetCity = getCityByName(target, targetCityName)
    if (!targetCity || targetCity.isAlive === false) {
      return { success: false, message: '目标城市已阵亡' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('玉碎瓦全', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 清除目标城市的保护罩（城市保护）
    if (gameStore.protections && gameStore.protections[target.name]) {
      if (gameStore.protections[target.name][targetCityName]) {
        delete gameStore.protections[target.name][targetCityName]
        addSkillEffectLog(gameStore, `(玉碎瓦全) 清除了${target.name}的${targetCity.name}的保护罩`)
      }
    }

    // 初始化玉碎瓦全状态结构
    if (!gameStore.yswq) {
      gameStore.yswq = {}
    }

    // 设置玉碎瓦全标记
    gameStore.yswq[caster.name] = {
      targetPlayer: target.name,
      targetCityName: targetCityName,
      targetCityKey: targetCityName,
      bannedProtection: true,  // 禁止对该城市使用城市保护
      round: gameStore.currentRound
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '玉碎瓦全',
      `${caster.name}使用了玉碎瓦全，玉碎瓦全生效，对${target.name}的城市：若本回合出战则攻击力翻倍并回合结束时消灭，若不出战则HP减半`,
      `你对${target.name}的${targetCity.name}使用了玉碎瓦全`
    )

    return {
      success: true,
      message: `对${target.name}的${targetCity.name}使用了玉碎瓦全`,
      data: {
        targetCityName: targetCity.name
      }
    }
  }
}
