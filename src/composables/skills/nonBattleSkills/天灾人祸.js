/**
 * 金币技能：天灾人祸
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteTianZaiRenHuo(gameStore) {
  return function executeTianZaiRenHuo(caster, target, targetCity) {
    if (!target || !targetCity) {
      return { success: false, message: '未选择目标' }
    }

    const targetCityName = targetCity.name
    if (!target.cities[targetCityName]) {
      return { success: false, message: '城市不存在' }
    }

    // 检查城市是否已知
    if (!gameStore.knownCities) {
      gameStore.knownCities = {}
    }
    if (!gameStore.knownCities[caster.name]) {
      gameStore.knownCities[caster.name] = {}
    }
    if (!gameStore.knownCities[caster.name][target.name]) {
      gameStore.knownCities[caster.name][target.name] = []
    }
    if (!gameStore.knownCities[caster.name][target.name].includes(targetCityName)) {
      return { success: false, message: '该城市尚未已知，无法使用天灾人祸' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '天灾人祸')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '天灾人祸',
        `${caster.name}使用天灾人祸，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了天灾人祸`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('天灾人祸', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, targetCityName)) {
      addSkillUsageLog(gameStore, caster.name, '天灾人祸',
        `${caster.name}使用了天灾人祸，但目标是副中心城市，技能无效`,
        `${caster.name}使用了天灾人祸`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 初始化结构
    if (!gameStore.disasterDebuff) {
      gameStore.disasterDebuff = {}
    }
    if (!gameStore.disasterDebuff[target.name]) {
      gameStore.disasterDebuff[target.name] = {}
    }

    // 设置天灾人祸效果：攻击力变为1，持续2回合
    gameStore.disasterDebuff[target.name][targetCityName] = TUNE.tianZaiRenHuo.rounds

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '天灾人祸',
      `${caster.name}对${target.name}的城市使用了天灾人祸，该城市攻击力变为1，持续2回合`,
      `${caster.name}对${target.name}的${targetCity.name}使用了天灾人祸，攻击力变为1，持续2回合`
    )

    return {
      success: true,
      message: `${targetCity.name}的攻击力变为1，持续2回合`
    }
  }
}
