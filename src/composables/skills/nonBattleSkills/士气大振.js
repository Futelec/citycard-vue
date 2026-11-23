/**
 * 金币技能：士气大振
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteShiQiDaZhen(gameStore) {
  return function executeShiQiDaZhen(caster) {
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('士气大振', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 恢复所有存活且当前HP低于初始HP的城市至初始HP
    let count = 0
    Object.values(caster.cities).forEach(city => {
      if (city && city.isAlive !== false && city.currentHp < city.hp) {
        city.currentHp = city.hp
        count++
      }
    })

    if (count === 0) {
      return {
        success: false,
        message: '没有存活城市可恢复'
      }
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '士气大振',
      `${caster.name} 使用士气大振，${count}个城市恢复至满血`,
      `${caster.name}使用了士气大振`
    )

    return {
      success: true,
      message: `所有城市恢复至满血`
    }
  }
}
