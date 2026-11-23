/**
 * 金币技能：副中心制
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteFuZhongXinZhi(gameStore) {
  return function executeFuZhongXinZhi(caster, selfCity) {
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

    // 检查是否已经是副中心
    if (gameStore.subCenters &&
        gameStore.subCenters[caster.name] === cityName) {
      return {
        success: false,
        message: '该城市已经是副中心城市'
      }
    }

    // 检查是否已有其他副中心
    if (gameStore.subCenters &&
        gameStore.subCenters[caster.name] !== undefined) {
      const oldSubCenterName = gameStore.subCenters[caster.name]
      const oldCity = caster.cities[oldSubCenterName]
      return {
        success: false,
        message: `${oldCity?.name}已经是副中心，一个玩家只能有一个副中心城市`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('副中心制', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 初始化subCenters结构
    if (!gameStore.subCenters) {
      gameStore.subCenters = {}
    }

    // 设置副中心
    gameStore.subCenters[caster.name] = cityName

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '副中心制',
      `${caster.name}对${selfCity.name}使用了副中心制，该城市成为副中心，攻击力×1.5，绝对保护`,
      `${caster.name}使用了副中心制`
    )

    return {
      success: true,
      message: `${selfCity.name}成为副中心，攻击力×1.5，绝对保护`,
      data: {
        cityName: selfCity.name
      }
    }
  }
}
