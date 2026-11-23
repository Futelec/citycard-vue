/**
 * 金币技能：实力增强
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteShiLiZengQiang(gameStore) {
  return function executeShiLiZengQiang(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // ✅ PDF明确说明："对中心无效"
    const cityName = selfCity.name
    const mode = gameStore.gameMode || '2P'

    if ((mode === '2P' || mode === '2v2') && cityName === caster.centerCityName) {
      return {
        success: false,
        message: '实力增强对中心城市无效'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('实力增强', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    const currentHp = selfCity.currentHp || selfCity.hp
    selfCity.currentHp = Math.min(currentHp * TUNE.shiLiZengQiang.hpMultiplier, TUNE.shiLiZengQiang.hpCap)

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '实力增强',
      `${caster.name} 对${selfCity.name}使用实力增强，HP翻倍`,
      `${caster.name}使用了实力增强`
    )

    return {
      success: true,
      message: `${selfCity.name}HP翻倍（上限50000）`
    }
  }
}
