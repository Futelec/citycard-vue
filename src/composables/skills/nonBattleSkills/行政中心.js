/**
 * 金币技能：行政中心
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteXingZhengZhongXin(gameStore) {
  return function executeXingZhengZhongXin(caster) {
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('行政中心', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    const adminCitiesToBoost = []

    Object.entries(caster.cities).forEach(([cityName, city]) => {
      if (!city || city.currentHp <= 0 || city.isAlive === false) return

      // 检查是否为直辖市、特别行政区、省会、首府、计划单列市
      const isSpecialCity = isCapitalCity(city.name) ||
                           isPlanCity(city.name) ||
                           isMunicipality(city.name) ||
                           isSpecialAdministrativeRegion(city.name)

      if (isSpecialCity) {
        const currentHpVal = city.currentHp !== undefined ? city.currentHp : city.hp
        const beforeHp = currentHpVal
        const newHp = currentHpVal * TUNE.xingZhengZhongXin.hpMultiplier

        // 应用HP上限：baseHp>30000 → 上限100000，否则上限80000
        const baseHp = city.baseHp || city.hp
        const hpCap = (baseHp > TUNE.xingZhengZhongXin.baseHpThreshold) ? TUNE.xingZhengZhongXin.highHpCap : TUNE.xingZhengZhongXin.hpCap
        city.currentHp = Math.min(newHp, hpCap)
        // 不修改 city.hp（max HP），只有一落千丈/连续打击可以改 max HP

        adminCitiesToBoost.push({
          name: city.name,
          before: Math.floor(beforeHp),
          after: Math.floor(city.currentHp)
        })
      }
    })

    if (adminCitiesToBoost.length === 0) {
      // 双日志：公开只显示使用了技能
      addSkillUsageLog(
        gameStore,
        caster.name,
        '行政中心',
        `${caster.name}使用了行政中心`,
        `你使用了行政中心，但没有符合条件的城市`
      )
      return {
        success: true,
        message: '没有符合条件的城市（需要直辖市、特别行政区、省会、首府或计划单列市）',
        hidePublicLog: true
      }
    }

    const summary = adminCitiesToBoost.map(c =>
      `${c.name}(${c.before}→${c.after})`
    ).join('、')

    // 双日志：公开只显示使用了技能，详情为私密
    addSkillUsageLog(
      gameStore,
      caster.name,
      '行政中心',
      `${caster.name}使用了行政中心`,
      `你使用了行政中心，提升了${adminCitiesToBoost.length}座城市：${summary}`
    )

    return {
      success: true,
      message: `成功提升${adminCitiesToBoost.length}座特殊城市的HP（×3）`,
      hidePublicLog: true,
      data: {
        boosted: adminCitiesToBoost
      }
    }
  }
}
