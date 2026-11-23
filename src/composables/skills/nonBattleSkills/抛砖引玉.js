/**
 * 金币技能：抛砖引玉
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecutePaoZhuanYinYu(gameStore) {
  return function executePaoZhuanYinYu(caster) {
    // 找到所有HP<2000的存活非中心城市
    const eligibleCities = Object.entries(caster.cities)
      .map(([name, city]) => ({ city, cityName: name }))
      .filter(({ city, cityName }) => {
        const currentHp = city.currentHp !== undefined ? city.currentHp : city.hp
        const isCenter = cityName === caster.centerCityName
        return city.isAlive !== false && currentHp < TUNE.paoZhuanYinYu.maxHp && !isCenter
      })

    if (eligibleCities.length === 0) {
      return {
        success: false,
        message: '没有可自毁的城市（需要HP<2000的非中心城市）'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('抛砖引玉', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 随机选择一座城市
    const randomIndex = Math.floor(Math.random() * eligibleCities.length)
    const { city: targetCity } = eligibleCities[randomIndex]

    // 记录HP用于日志
    const oldHp = targetCity.currentHp !== undefined ? targetCity.currentHp : targetCity.hp

    // 自毁城市（只改 currentHp，保留 hp/max HP）
    targetCity.currentHp = 0
    targetCity.isAlive = false

    // 随机获得1-5金币
    const goldGain = Math.floor(Math.random() * TUNE.paoZhuanYinYu.goldGainRandomRange) + TUNE.paoZhuanYinYu.goldGainMin  // 1-5
    // const beforeGold = caster.gold
    caster.gold = Math.min(TUNE.paoZhuanYinYu.goldCap, caster.gold + goldGain)

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '抛砖引玉',
      `${caster.name}使用抛砖引玉，自毁${targetCity.name}(HP:${Math.floor(oldHp)})，获得${goldGain}金币`,
      `${caster.name}使用了抛砖引玉，自毁${targetCity.name}，获得${goldGain}金币`
    )

    return {
      success: true,
      message: `自毁${targetCity.name}，获得${goldGain}金币`
    }
  }
}
