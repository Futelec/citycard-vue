/**
 * 金币技能：城市预言
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteCityProphecy(gameStore) {
  return function executeCityProphecy(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('城市预言', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '城市预言')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '城市预言',
        `${caster.name}使用城市预言，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了城市预言`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }


    // 统计探测到的城市
    let detectedCount = 0
    let purpleChamberSkipped = 0
    const detectedCityNames = []

    // 遍历对手所有城市
    Object.entries(target.cities).forEach(([cityName, city]) => {
      if (!city || city.isAlive === false || city.currentHp <= 0) {
        // 跳过已阵亡的城市
        return
      }

      // 检查是否是生于紫室城市
      if (gameStore.purpleChamber && gameStore.purpleChamber[target.name] === cityName) {
        purpleChamberSkipped++
        return
      }

      // 跳过副中心城市（城市预言不可探测）
      if (gameStore.isSubCenter(target.name, cityName)) return

      // 跳过深藏不露城市（城市预言不可探测）
      if (gameStore.hiddenGrowth && gameStore.hiddenGrowth[target.name] &&
          gameStore.hiddenGrowth[target.name][cityName]) return

      // 标记为已知城市
      gameStore.setCityKnown(target.name, cityName, caster.name)
      detectedCount++
      detectedCityNames.push(city.name)
    })

    // 记录私有日志（仅施放者可见）
    if (gameStore.addPrivateLog && detectedCount > 0) {
      let privateMsg = `你对${target.name}使用了城市预言，探测到${detectedCount}座城市：${detectedCityNames.join('、')}`
      if (purpleChamberSkipped > 0) {
        privateMsg += `（有${purpleChamberSkipped}座生于紫室城市未被探测）`
      }
      gameStore.addPrivateLog(caster.name, privateMsg)
    }

    // 记录公开日志
    let publicMessage = `${caster.name}对${target.name}使用了城市预言`
    if (purpleChamberSkipped > 0) {
      publicMessage += `，使${detectedCount}座城市成为己方已知城市（${purpleChamberSkipped}座生于紫室城市未被探测）`
    } else {
      publicMessage += `，使${detectedCount}座城市成为己方已知城市`
    }

    addSkillUsageLog(
      gameStore,
      caster.name,
      '城市预言',
      publicMessage,
      `${caster.name}使用了城市预言`
    )

    return {
      success: true,
      message: `成功探测${target.name}的${detectedCount}座城市${purpleChamberSkipped > 0 ? `（${purpleChamberSkipped}座生于紫室城市未被探测）` : ''}`,
      data: {
        detectedCount: detectedCount,
        purpleChamberSkipped: purpleChamberSkipped
      }
    }
  }
}
