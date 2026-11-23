/**
 * 金币技能：当机立断
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteDangJiLiDuan(gameStore) {
  return function executeDangJiLiDuan(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('当机立断', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    const clearedEffects = []

    // 1. 清除对方对我方使用的天灾人祸
    if (gameStore.disasterDebuff && gameStore.disasterDebuff[caster.name]) {
      const disasterCount = Object.keys(gameStore.disasterDebuff[caster.name]).length
      if (disasterCount > 0) {
        delete gameStore.disasterDebuff[caster.name]
        clearedEffects.push(`天灾人祸×${disasterCount}`)
      }
    }

    // 2. 清除对方对我方使用的电磁感应
    if (gameStore.electromagnetic && gameStore.electromagnetic[caster.name] &&
        gameStore.electromagnetic[caster.name].source === target.name) {
      delete gameStore.electromagnetic[caster.name]
      clearedEffects.push('电磁感应')
    }

    // 3. 清除对方对我方使用的寸步难行
    if (gameStore.stareDown && gameStore.stareDown[caster.name] &&
        gameStore.stareDown[caster.name].source === target.name) {
      delete gameStore.stareDown[caster.name]
      clearedEffects.push('寸步难行')
    }

    // 4. 清除对方的定时爆破
    if (gameStore.timeBombs && gameStore.timeBombs[target.name]) {
      const bombCount = Object.keys(gameStore.timeBombs[target.name]).length
      if (bombCount > 0) {
        delete gameStore.timeBombs[target.name]
        clearedEffects.push(`定时爆破×${bombCount}`)
      }
    }

    // 5. 清除对方的不露踪迹
    if (gameStore.stealthMode && gameStore.stealthMode[target.name]) {
      delete gameStore.stealthMode[target.name]
      clearedEffects.push('不露踪迹')
    }

    // 6. 清除对方的屏障
    if (gameStore.barrier && gameStore.barrier[target.name]) {
      delete gameStore.barrier[target.name]
      clearedEffects.push('设置屏障')
    }

    // 7. 清除对方的潜能激发溢出
    if (gameStore.potentialOverflow && gameStore.potentialOverflow[target.name]) {
      delete gameStore.potentialOverflow[target.name]
      clearedEffects.push('潜能激发溢出')
    }

    // 8. 清除对方的海市蜃楼
    if (gameStore.mirage && gameStore.mirage[target.name]) {
      delete gameStore.mirage[target.name]
      clearedEffects.push('海市蜃楼')
    }

    // 9. 清除金融危机（全局效果）
    if (gameStore.financialCrisis && gameStore.financialCrisis.roundsLeft > 0) {
      gameStore.financialCrisis = null
      clearedEffects.push('金融危机')
    }

    // 10. 清除对方的城市保护
    if (gameStore.protections && gameStore.protections[target.name]) {
      const count = Object.keys(gameStore.protections[target.name]).length
      if (count > 0) {
        delete gameStore.protections[target.name]
        clearedEffects.push(`城市保护×${count}`)
      }
    }

    // 11. 清除对方的高级治疗（清除healing状态和对应出战禁令）
    if (target.cities) {
      const healingCities = []
      Object.entries(target.cities).forEach(([cityName, city]) => {
        if (city && city.isInHealing) {
          city.isInHealing = false
          healingCities.push(cityName)
          // 清除对应的出战禁令
          if (gameStore.bannedCities[target.name] && gameStore.bannedCities[target.name][cityName]) {
            delete gameStore.bannedCities[target.name][cityName]
          }
        }
      })
      if (healingCities.length > 0) {
        clearedEffects.push(`高级治疗(${healingCities.length}个)`)
      }
    }

    // 12. 清除对方的城市试炼（恢复原始HP并清除禁令）
    if (gameStore.cityTrialField && gameStore.cityTrialField[target.name]) {
      const trialCities = Object.keys(gameStore.cityTrialField[target.name])
      if (trialCities.length > 0) {
        for (const cityName of trialCities) {
          const cfg = gameStore.cityTrialField[target.name][cityName]
          // 恢复原始HP
          if (cfg && cfg.originalHp && target.cities[cityName]) {
            target.cities[cityName].currentHp = cfg.originalHp
          }
          // 清除对应的出战禁令
          if (gameStore.bannedCities[target.name] && gameStore.bannedCities[target.name][cityName]) {
            delete gameStore.bannedCities[target.name][cityName]
          }
        }
        delete gameStore.cityTrialField[target.name]
        clearedEffects.push(`城市试炼(${trialCities.length}个，已恢复HP)`)
      }
    }

    // 13. 清除对方的同归于尽
    if (target.cities) {
      let tgyjjCount = 0
      Object.values(target.cities).forEach(city => {
        if (city && city.modifiers && Array.isArray(city.modifiers)) {
          const before = city.modifiers.length
          city.modifiers = city.modifiers.filter(m => m.type !== 'mutual_destruction')
          tgyjjCount += before - city.modifiers.length
        }
      })
      if (tgyjjCount > 0) {
        clearedEffects.push(`同归于尽×${tgyjjCount}`)
      }
    }

    // 14. 清除对方的狐假虎威伪装
    if (gameStore.disguisedCities && gameStore.disguisedCities[target.name]) {
      const count = Object.keys(gameStore.disguisedCities[target.name]).length
      if (count > 0) {
        delete gameStore.disguisedCities[target.name]
        clearedEffects.push(`狐假虎威×${count}`)
      }
    }

    if (clearedEffects.length === 0) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '当机立断',
        `${caster.name}对${target.name}使用了当机立断，但没有可清除的效果`,
        `${caster.name}使用了当机立断`
      )
      return {
        success: true,
        message: '当机立断使用成功，但没有可清除的效果'
      }
    }

    const effectsStr = clearedEffects.join('、')
    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '当机立断',
      `${caster.name}对${target.name}使用了当机立断，清除了${effectsStr}`,
      `${caster.name}使用了当机立断`
    )

    return {
      success: true,
      message: `成功清除了${effectsStr}`,
      data: {
        clearedEffects: clearedEffects
      }
    }
  }
}
