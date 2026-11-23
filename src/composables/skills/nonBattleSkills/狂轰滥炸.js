/**
 * 金币技能：狂轰滥炸
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteKuangHongLanZha(gameStore) {
  return function executeKuangHongLanZha(caster, target) {
    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '狂轰滥炸')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '狂轰滥炸',
        `${caster.name}使用狂轰滥炸，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了狂轰滥炸`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('狂轰滥炸', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 获取所有存活城市（带城市名）
    const aliveCities = []
    Object.entries(target.cities).forEach(([cityName, city]) => {
      if (city.isAlive !== false) {
        aliveCities.push({ city, cityName })
      }
    })

    if (aliveCities.length === 0) {
      return { success: false, message: '没有存活城市' }
    }

    // 对每个城市检查护盾并造成伤害
    let affectedCount = 0
    let blockedCount = 0
    let casualties = 0

    for (const { city, cityName } of aliveCities) {
      // 检查并消耗保护罩/钢铁护盾
      if (gameStore.consumeProtection(target.name, cityName)) {
        blockedCount++
        continue
      }

      // 造成伤害
      const currentHp = city.currentHp || city.hp
      const newHp = Math.max(0, currentHp - TUNE.kuangHongLanZha.damage)
      city.currentHp = newHp

      // 检查是否阵亡
      if (newHp <= 0) {
        city.isAlive = false
        casualties++

        // 添加到deadCities列表
        if (!gameStore.deadCities[target.name]) {
          gameStore.deadCities[target.name] = []
        }
        if (!gameStore.deadCities[target.name].includes(cityName)) {
          gameStore.deadCities[target.name].push(cityName)
        }
      }

      affectedCount++
    }

    // 记录日志
    if (blockedCount > 0) {
      addSkillEffectLog(gameStore, `狂轰滥炸被${target.name}的${blockedCount}个城市护盾抵消`)
    }
    if (affectedCount > 0) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '狂轰滥炸',
        `${caster.name}对${target.name}的${affectedCount}个城市使用狂轰滥炸，摧毁${casualties}个`,
        `${caster.name}使用了狂轰滥炸`
      )
    }

    if (affectedCount === 0 && blockedCount > 0) {
      return {
        success: true,
        message: '所有伤害被护盾抵消'
      }
    }

    return {
      success: true,
      message: `造成${affectedCount}×1500伤害，摧毁${casualties}个城市${blockedCount > 0 ? `，${blockedCount}个被护盾保护` : ''}`
    }
  }
}
