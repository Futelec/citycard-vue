/**
 * 金币技能：钢铁城市
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteGangTieChengShi(gameStore) {
  return function executeGangTieChengShi(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // 验证城市存在
    const cityName = selfCity.name
    if (!caster.cities[cityName]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    // 检查是否已经是钢铁城市
    if (gameStore.ironCities[caster.name] && gameStore.ironCities[caster.name][cityName]) {
      return {
        success: false,
        message: '该城市已经是钢铁城市'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('钢铁城市', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 在gameStore中设置钢铁护盾（2层免疫）
    if (!gameStore.ironCities[caster.name]) {
      gameStore.ironCities[caster.name] = {}
    }
    gameStore.ironCities[caster.name][cityName] = TUNE.gangTieChengShi.shieldLayers  // ✅ 修复：设置为2层，而非true

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '钢铁城市',
      `${caster.name} 对${selfCity.name}使用钢铁城市，免疫2次技能侵害`,
      `${caster.name}使用了钢铁城市`
    )

    return {
      success: true,
      message: `${selfCity.name}成为钢铁城市，免疫2次技能侵害（第一次后变普通护盾）`
    }
  }
}
