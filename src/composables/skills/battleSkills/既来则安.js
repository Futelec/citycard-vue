/**
 * 金币技能：既来则安
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'

export function createExecuteJiLaiZeAn(gameStore) {
  return function executeJiLaiZeAn(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // 获取城市名称
    const cityName = selfCity.name
    if (!caster.cities[cityName]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('既来则安', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // 在gameStore中设置既来则安状态
    if (!gameStore.jilaizan[caster.name]) {
      gameStore.jilaizan[caster.name] = {}
    }
    gameStore.jilaizan[caster.name][cityName] = true

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '既来则安',
      `${caster.name}使用了既来则安，${selfCity.name} 获得既来则安效果，本轮免疫伤害`,
      `${caster.name}对 ${selfCity.name} 使用了既来则安`
    )

    return {
      success: true,
      message: `${selfCity.name}本轮免疫伤害`
    }
  }
}
