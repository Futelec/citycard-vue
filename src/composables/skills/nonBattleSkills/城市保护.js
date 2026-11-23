/**
 * 金币技能：城市保护
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteCityProtection(gameStore) {
  return function executeCityProtection(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // 验证城市存在
    const cityName = selfCity.name
    if (!caster.cities[cityName]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    // 检查是否已有保护
    if (gameStore.protections[caster.name]?.[cityName]) {
      return { success: false, message: '该城市已有保护' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('城市保护', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 在gameStore中设置保护罩
    if (!gameStore.protections[caster.name]) {
      gameStore.protections[caster.name] = {}
    }
    gameStore.protections[caster.name][cityName] = TUNE.cityProtection.rounds

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '城市保护',
      `${caster.name} 对${selfCity.name}使用城市保护，10回合内免疫1次技能`,
      `${caster.name}使用了城市保护`
    )

    return {
      success: true,
      message: `${selfCity.name}获得保护罩，10回合内免疫1次技能`
    }
  }
}
