/**
 * 金币技能：李代桃僵
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteLiDaiTaoJiang(gameStore) {
  return function executeLiDaiTaoJiang(caster) {
    // 检查本轮是否已使用
    if (!gameStore.ldtj) {
      gameStore.ldtj = {}
    }
    if (gameStore.ldtj[caster.name]) {
      return { success: false, message: '本轮已经使用过李代桃僵！' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('李代桃僵', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 设置李代桃僵标记（本回合有效）
    gameStore.ldtj[caster.name] = true

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '李代桃僵',
      `${caster.name}使用了李代桃僵，本轮被时来运转或人质交换时可以自己选择交换的城市`,
      `${caster.name}使用了李代桃僵`
    )

    return {
      success: true,
      message: '李代桃僵生效！本轮被动交换时可自己选择城市'
    }
  }
}
