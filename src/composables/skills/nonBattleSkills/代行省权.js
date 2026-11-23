/**
 * 金币技能：代行省权
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteDaiXingShengQuan(gameStore) {
  return function executeDaiXingShengQuan(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    const cityName = selfCity.name
    if (!caster.cities[cityName]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    if (selfCity.currentHp <= 0 || selfCity.isAlive === false) {
      return { success: false, message: '该城市已阵亡' }
    }

    // 获取城市省份
    const prov = selfCity.province || PROVINCE_MAP[selfCity.name]?.name

    if (!prov) {
      return { success: false, message: '无法确定城市所属省份' }
    }

    // 检查是否已经是省会
    const isCapital = selfCity.isCapitalCity || isCapitalCity(selfCity.name, prov)

    if (isCapital) {
      return { success: false, message: '该城市已经是省会城市，无需代行省权' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('代行省权', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 初始化actingCapital玩家条目（actingCapital已在gameStore中声明为reactive）
    if (!gameStore.actingCapital[caster.name]) {
      gameStore.actingCapital[caster.name] = {}
    }

    // 设置临时省会状态
    gameStore.actingCapital[caster.name][cityName] = {
      province: prov,
      cityName: selfCity.name
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '代行省权',
      `${caster.name}对${selfCity.name}使用了代行省权，该城市临时成为${prov}的省会`,
      `${caster.name}使用了代行省权`
    )

    return {
      success: true,
      message: `${selfCity.name}临时成为${prov}的省会`,
      data: {
        cityName: selfCity.name,
        province: prov
      }
    }
  }
}
