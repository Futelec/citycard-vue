/**
 * 金币技能：一落千丈
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteYiLuoQianZhang(gameStore) {
  return function executeYiLuoQianZhang(caster, target, targetCity) {
    if (!targetCity) {
      return { success: false, message: '未选择目标城市' }
    }

    // 不能对中心城市使用
    if (targetCity.isCenter) {
      return { success: false, message: '无法对中心城市使用' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '一落千丈')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '一落千丈',
        `${caster.name}使用一落千丈，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了一落千丈`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('一落千丈', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 获取城市名称
    const cityName = targetCity.name

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, cityName)) {
      addSkillUsageLog(gameStore, caster.name, '一落千丈',
        `${caster.name}使用了一落千丈，但目标是副中心城市，技能无效`,
        `${caster.name}使用了一落千丈`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 检查并消耗保护罩/钢铁护盾
    if (gameStore.consumeProtection(target.name, cityName)) {
      addSkillEffectLog(gameStore, `一落千丈被${target.name}的城市护盾抵消`)
      return {
        success: true,
        message: `效果被护盾抵消`
      }
    }

    const currentHp = targetCity.currentHp || targetCity.hp
    const newCurrentHp = Math.floor(currentHp / TUNE.yiLuoQianZhang.hpDivisor)
    const newBaseHp = Math.floor(targetCity.hp / TUNE.yiLuoQianZhang.hpDivisor)

    targetCity.currentHp = newCurrentHp
    targetCity.hp = newBaseHp  // 同时修改初始HP

    // 检查是否阵亡
    if (newCurrentHp <= 0) {
      targetCity.isAlive = false

      // 添加到deadCities列表
      if (!gameStore.deadCities[target.name]) {
        gameStore.deadCities[target.name] = []
      }
      if (cityName && !gameStore.deadCities[target.name].includes(cityName)) {
        gameStore.deadCities[target.name].push(cityName)
      }

      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '一落千丈',
        `${caster.name}对${target.name}的城市使用一落千丈，城市阵亡`,
        `${caster.name}对${target.name}的${targetCity.name}使用一落千丈，HP从${currentHp}降至${newCurrentHp}，初始HP降至${newBaseHp}，城市阵亡`
      )
    } else {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '一落千丈',
        `${caster.name}对${target.name}的城市使用一落千丈`,
        `${caster.name}对${target.name}的${targetCity.name}使用一落千丈，HP从${currentHp}降至${newCurrentHp}，初始HP降至${newBaseHp}`
      )
    }

    return {
      success: true,
      message: `${targetCity.name}的HP降至${newCurrentHp}`
    }
  }
}
