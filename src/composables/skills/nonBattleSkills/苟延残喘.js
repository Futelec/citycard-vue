/**
 * 金币技能：苟延残喘
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteGouYanCanChuan(gameStore) {
  return function executeGouYanCanChuan(caster) {
    // 从未使用城市池中筛选HP<1000的城市
    const unusedCities = gameStore.getUnusedCities()
    const lowHpCities = unusedCities.filter(city => city.hp < TUNE.gouYanCanChuan.maxHp)

    if (lowHpCities.length < TUNE.gouYanCanChuan.count) {
      return {
        success: false,
        message: `城市池中HP<1000的城市不足（仅剩${lowHpCities.length}个）`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('苟延残喘', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 随机抽取2个
    const shuffled = lowHpCities.sort(() => Math.random() - 0.5)
    const selectedCities = shuffled.slice(0, TUNE.gouYanCanChuan.count)

    const addedCities = []

    for (const cityData of selectedCities) {
      // 创建城市副本
      const newCity = {
        name: cityData.name,
        hp: cityData.hp,
        currentHp: cityData.hp,
        baseHp: cityData.hp,
        isAlive: true,
        red: cityData.red || 0,
        green: cityData.green || 0,
        blue: cityData.blue || 0,
        yellow: cityData.yellow || 0,
        modifiers: []
      }

      // 添加到玩家城市列表
      caster.cities[newCity.name] = newCity
      addedCities.push(newCity)

      // 标记为已使用
      gameStore.markCityAsUsed(cityData.name)

      // 记录到initialCities
      if (!gameStore.initialCities[caster.name]) {
        gameStore.initialCities[caster.name] = {}
      }
      gameStore.initialCities[caster.name][newCity.name] = {
        name: newCity.name,
        hp: newCity.hp,
        currentHp: newCity.hp,
        baseHp: newCity.hp,
        isAlive: true
      }
    }

    // 如果总城市数≤5，自动加入roster
    if (Object.keys(caster.cities).length <= TUNE.gouYanCanChuan.autoRosterMaxCities) {
      if (!gameStore.roster[caster.name]) {
        gameStore.roster[caster.name] = []
      }
      // 加入刚添加的两个城市的名称
      for (const addedCity of addedCities) {
        if (!gameStore.roster[caster.name].includes(addedCity.name)) {
          gameStore.roster[caster.name].push(addedCity.name)
        }
      }
    }

    // 双日志：公开只显示使用了技能，获得的城市信息为私密
    addSkillUsageLog(
      gameStore,
      caster.name,
      '苟延残喘',
      `${caster.name}使用了苟延残喘`,
      `你使用苟延残喘，获得了${addedCities.map(c => `${c.name}(${c.hp})`).join('、')}`
    )

    return {
      success: true,
      message: `获得了2个小血量城市`,
      hidePublicLog: true
    }
  }
}
