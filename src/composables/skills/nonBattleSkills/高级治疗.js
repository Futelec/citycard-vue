/**
 * 金币技能：高级治疗
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteGaoJiZhiLiao(gameStore) {
  return function executeGaoJiZhiLiao(caster, cityNames) {
    if (!cityNames || cityNames.length !== TUNE.gaoJiZhiLiao.requiredCities) {
      return { success: false, message: '需要选择2个城市' }
    }

    // 检查己方至少有3座存活城市
    const aliveCities = Object.values(caster.cities).filter(c =>
      c && c.isAlive !== false && ((c.currentHp !== undefined ? c.currentHp : c.hp) > 0)
    )
    if (aliveCities.length < TUNE.gaoJiZhiLiao.minAliveCities) {
      return { success: false, message: `己方至少需要3座存活城市（当前${aliveCities.length}座）` }
    }

    // 筛选存活且非满血的城市
    const cities = cityNames.map(cityName => {
      const city = caster.cities[cityName]
      if (!city) return null
      if (city.isAlive === false) return null

      const currentHp = city.currentHp !== undefined ? city.currentHp : city.hp
      const maxHp = city.hp
      if (currentHp >= maxHp) return null

      return { city, cityName, maxHp }
    }).filter(Boolean)

    if (cities.length !== TUNE.gaoJiZhiLiao.requiredCities) {
      return { success: false, message: '需要选择2个存活且受伤的城市' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('高级治疗', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 立即恢复满血
    cities.forEach(({ city, maxHp }) => {
      city.currentHp = maxHp
    })

    // 本回合和下回合无法出战（bannedCities = 2）
    if (!gameStore.bannedCities[caster.name]) {
      gameStore.bannedCities[caster.name] = {}
    }
    cities.forEach(({ city }) => {
      gameStore.bannedCities[caster.name][city.name] = TUNE.gaoJiZhiLiao.banRounds
      city.isInHealing = true
    })

    const cityNamesStr = cities.map(({ city }) => city.name).join('、')
    // 公开日志只显示技能名，私有日志显示详情
    addSkillUsageLog(
      gameStore,
      caster.name,
      '高级治疗',
      `${caster.name}使用了高级治疗`,
      `你对${cityNamesStr}使用高级治疗，立即恢复满血，本回合和下回合无法出战`
    )

    return {
      success: true,
      message: `${cityNamesStr}已恢复满血，本回合和下回合无法出战`,
      hidePublicLog: true
    }
  }
}
