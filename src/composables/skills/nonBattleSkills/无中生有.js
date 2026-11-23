/**
 * 金币技能：无中生有
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteWuZhongShengYou(gameStore) {
  return function executeWuZhongShengYou(caster) {
    // 从未使用的城市池中抽取
    const unusedCities = gameStore.getUnusedCities()

    if (unusedCities.length === 0) {
      return {
        success: false,
        message: '城市池已空，无法抽取'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('无中生有', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 随机选择一个未使用的城市
    const randomCity = unusedCities[Math.floor(Math.random() * unusedCities.length)]

    // 创建城市副本（避免引用问题）
    const newCity = {
      name: randomCity.name,
      hp: randomCity.hp,
      currentHp: randomCity.hp,
      baseHp: randomCity.hp,
      isAlive: true,
      red: randomCity.red || 0,
      green: randomCity.green || 0,
      blue: randomCity.blue || 0,
      yellow: randomCity.yellow || 0,
      modifiers: []
    }

    // 添加到玩家城市列表
    caster.cities[newCity.name] = newCity

    // 标记为已使用
    gameStore.markCityAsUsed(randomCity.name)

    // 记录到initialCities（如果有该系统）
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

    // 如果总城市数≤5，自动加入roster
    if (Object.keys(caster.cities).length <= TUNE.wuZhongShengYou.autoRosterMaxCities) {
      if (!gameStore.roster[caster.name]) {
        gameStore.roster[caster.name] = []
      }
      if (!gameStore.roster[caster.name].includes(newCity.name)) {
        gameStore.roster[caster.name].push(newCity.name)
      }
    }

    // 双日志：公开只显示使用了技能，城市详情仅施法者可见
    addSkillUsageLog(
      gameStore,
      caster.name,
      '无中生有',
      `${caster.name}使用了无中生有`,
      `${caster.name}使用无中生有，获得了${newCity.name}(HP: ${newCity.hp})`
    )

    return {
      success: true,
      message: `获得了${newCity.name}(HP: ${newCity.hp})`,
      hidePublicLog: true
    }
  }
}
