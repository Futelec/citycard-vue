/**
 * 金币技能：城市侦探
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteCityDetective(gameStore) {
  return function executeCityDetective(caster, target, targetCityName) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    if (targetCityName === undefined) {
      return { success: false, message: '未选择目标城市' }
    }

    const targetCity = target.cities[targetCityName]
    if (!targetCity) {
      return { success: false, message: '目标城市不存在' }
    }

    // 检查城市是否已知
    if (!gameStore.knownCities || !gameStore.knownCities[caster.name] ||
        !gameStore.knownCities[caster.name][target.name] ||
        !gameStore.knownCities[caster.name][target.name].includes(targetCityName)) {
      return { success: false, message: '该城市尚未已知，无法使用城市侦探' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('城市侦探', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, targetCityName)) {
      addSkillUsageLog(gameStore, caster.name, '城市侦探',
        `${caster.name}使用了城市侦探，但目标是副中心城市，技能无效`,
        `${caster.name}使用了城市侦探`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '城市侦探')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '城市侦探',
        `${caster.name}使用城市侦探，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了城市侦探`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }


    // 获取初始HP
    const initialCityData = gameStore.initialCities &&
                            gameStore.initialCities[target.name] &&
                            gameStore.initialCities[target.name][targetCityName]
    const originalHp = initialCityData ? initialCityData.hp : (targetCity.baseHp || targetCity.hp)

    const currentHp = targetCity.currentHp || targetCity.hp

    // 构建城市信息
    const cityInfo = {
      name: targetCity.name,
      originalHp: Math.floor(originalHp),
      currentHp: Math.floor(currentHp)
    }

    const infoText = `城市名：${cityInfo.name}\nHP原始值：${cityInfo.originalHp}\n当前HP：${cityInfo.currentHp}`

    // 记录私有日志（只有施法者能看到）
    if (gameStore.addPrivateLog) {
      gameStore.addPrivateLog(caster.name, `你对${target.name}使用了城市侦探，查看了${cityInfo.name}的信息：\n${infoText}`)
    }

    // 记录公开日志
    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '城市侦探',
      `${caster.name}对${target.name}使用了城市侦探`,
      `${caster.name}使用了城市侦探`
    )


    return {
      success: true,
      message: `城市侦探：\n\n${infoText}`,
      data: {
        cityInfo: cityInfo
      }
    }
  }
}
