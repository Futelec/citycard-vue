/**
 * 金币技能：深藏不露
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteShenCangBuLu(gameStore) {
  return function executeShenCangBuLu(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // 验证城市存在
    const cityName = selfCity.name
    if (!caster.cities[cityName]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    // 检查城市是否存活
    if (selfCity.currentHp <= 0 || selfCity.isAlive === false) {
      return { success: false, message: '城市已阵亡，无法使用深藏不露' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('深藏不露', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 初始化深藏不露结构
    if (!gameStore.hiddenGrowth[caster.name]) {
      gameStore.hiddenGrowth[caster.name] = {}
    }

    // 设置深藏不露状态
    gameStore.hiddenGrowth[caster.name][cityName] = {
      idleRounds: 0,
      active: true,
      everDied: false
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '深藏不露',
      `>>> ${caster.name}对${selfCity.name}使用深藏不露，每连续5回合未出战将自动增加10000HP`,
      `${caster.name}使用了深藏不露`
    )

    return {
      success: true,
      message: `${selfCity.name}每连续5回合未出战将获得10000HP`
    }
  }
}
