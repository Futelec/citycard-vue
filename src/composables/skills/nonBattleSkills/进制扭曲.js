/**
 * 金币技能：进制扭曲
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteJinZhiNiuQu(gameStore) {
  return function executeJinZhiNiuQu(caster, target, targetCity) {
    if (!targetCity) {
      return { success: false, message: '未选择目标城市' }
    }

    // 检查是否是中心城市
    if (target && target.centerCityName && targetCity.name === target.centerCityName) {
      return { success: false, message: '无法对中心城市使用进制扭曲' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '进制扭曲')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '进制扭曲',
        `${caster.name}使用进制扭曲，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了进制扭曲`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('进制扭曲', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 获取城市名称
    const cityName = targetCity.name

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, cityName)) {
      addSkillUsageLog(gameStore, caster.name, '进制扭曲',
        `${caster.name}使用了进制扭曲，但目标是副中心城市，技能无效`,
        `${caster.name}使用了进制扭曲`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 检查并消耗保护罩/钢铁护盾
    if (gameStore.consumeProtection(target.name, cityName)) {
      addSkillEffectLog(gameStore, `进制扭曲被${target.name}的城市护盾抵消`)
      return {
        success: true,
        message: `效果被护盾抵消`
      }
    }

    const currentHp = targetCity.currentHp || targetCity.hp
    const hpStr = currentHp.toString()

    // 检查是否包含8或9
    if (hpStr.includes('8') || hpStr.includes('9')) {
      return { success: false, message: 'HP中包含8或9，无法使用' }
    }

    // 八进制转十进制
    const newHp = parseInt(hpStr, TUNE.jinZhiNiuQu.radix)
    targetCity.currentHp = newHp

    // 检查是否阵亡
    if (newHp <= 0) {
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
        '进制扭曲',
        `${caster.name}对${target.name}的城市使用进制扭曲，城市阵亡`,
        `${caster.name}对${target.name}的${targetCity.name}使用进制扭曲，HP从${currentHp}变为${newHp}，城市阵亡`
      )
    } else {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '进制扭曲',
        `${caster.name}对${target.name}的城市使用进制扭曲`,
        `${caster.name}对${target.name}的${targetCity.name}使用进制扭曲，HP从${currentHp}变为${newHp}`
      )
    }

    return {
      success: true,
      message: `HP从${currentHp}(八进制)变为${newHp}(十进制)`
    }
  }
}
