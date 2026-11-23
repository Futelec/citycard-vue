/**
 * 金币技能：狐假虎威
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteHuJiaHuWei(gameStore) {
  return function executeHuJiaHuWei(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // 从未使用城市池中筛选HP≥10000的城市作为伪装数据源
    const unusedCities = gameStore.getUnusedCities()
    const highHpCities = unusedCities.filter(city => city.hp >= TUNE.huJiaHuWei.minOriginalHp)

    if (highHpCities.length === 0) {
      return {
        success: false,
        message: '城市池中没有HP≥10000的城市可用于伪装'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('狐假虎威', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 随机选择一个高HP城市作为伪装模板
    const disguiseTemplate = highHpCities[Math.floor(Math.random() * highHpCities.length)]

    // 验证城市存在
    const cityName = selfCity.name
    if (!caster.cities[cityName]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    // 初始化disguisedCities
    if (!gameStore.disguisedCities[caster.name]) {
      gameStore.disguisedCities[caster.name] = {}
    }

    // 设置伪装数据（m/cur/n三重HP追踪）
    gameStore.disguisedCities[caster.name][cityName] = {
      m: disguiseTemplate.hp,              // 初始伪装HP
      cur: disguiseTemplate.hp,            // 当前伪装HP（会随伤害变化）
      n: selfCity.currentHp || selfCity.hp, // 真实HP（隐藏）
      fakeName: disguiseTemplate.name,     // 伪装名称
      paid: false,                         // 被拆穿时扣9金币标记
      roundsLeft: TUNE.huJiaHuWei.rounds                        // 持续3回合
    }

    // 清除该城市的已知状态（对手不知道这是什么城市）
    gameStore.clearCityKnownStatus(caster.name, cityName)

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '狐假虎威',
      `${caster.name}对${selfCity.name}使用狐假虎威，伪装成${disguiseTemplate.name}(${disguiseTemplate.hp}HP)，持续3回合`,
      `${caster.name}使用了狐假虎威`
    )

    return {
      success: true,
      message: `${selfCity.name}伪装成${disguiseTemplate.name}，持续3回合`
    }
  }
}
