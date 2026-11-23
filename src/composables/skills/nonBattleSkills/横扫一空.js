/**
 * 金币技能：横扫一空
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteHengSaoYiKong(gameStore) {
  return function executeHengSaoYiKong(caster, target) {
    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '横扫一空')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '横扫一空',
        `${caster.name}使用横扫一空，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了横扫一空`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('横扫一空', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 筛选出有专属技能的城市（存活且有skillUsageCount定义的城市）
    const citiesWithSkills = []
    Object.entries(target.cities).forEach(([cityName, city]) => {
      if (city && city.isAlive !== false && city.currentHp > 0 && city.skillUsageCount !== undefined) {
        citiesWithSkills.push({ city, cityName })
      }
    })

    if (citiesWithSkills.length === 0) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '横扫一空',
        `${caster.name}对${target.name}使用横扫一空，但对手没有拥有专属技能的城市`,
        `${caster.name}使用了横扫一空`
      )
      return {
        success: false,
        message: `对手没有拥有专属技能的城市`
      }
    }

    // 随机选择最多3座城市
    const numToSelect = Math.min(TUNE.hengSaoYiKong.maxCities, citiesWithSkills.length)
    const selectedCities = []

    // Fisher-Yates洗牌算法随机选择
    const shuffled = [...citiesWithSkills]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    for (let i = 0; i < numToSelect; i++) {
      selectedCities.push(shuffled[i])
    }

    // 清空选中城市的技能使用次数
    const clearedCityNames = []
    selectedCities.forEach(({ city, cityName }) => {
      city.skillUsageCount = 0
      clearedCityNames.push(city.name)
    })

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '横扫一空',
      `${caster.name}对${target.name}使用横扫一空，清空了${clearedCityNames.length}座城市的专属技能：${clearedCityNames.join('、')}`,
      `${caster.name}使用了横扫一空`
    )

    return {
      success: true,
      message: `清空了${clearedCityNames.length}座城市的专属技能：${clearedCityNames.join('、')}`
    }
  }
}
