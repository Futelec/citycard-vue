/**
 * 金币技能：狂暴模式
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteKuangBaoMoShi(gameStore) {
  return function executeKuangBaoMoShi(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // 己方城市数量大于等于2时使用
    const aliveCityCount = Object.values(caster.cities).filter(c => c && (c.currentHp > 0 || c.hp > 0)).length
    if (aliveCityCount < TUNE.kuangBaoMoShi.minCities) {
      return { success: false, message: '己方城市数量不足2座，无法使用狂暴模式' }
    }

    // 获取城市名称
    const cityName = selfCity.name
    if (!caster.cities[cityName]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    // 检查是否已使用过狂暴模式
    if (gameStore.berserkFired[caster.name] && gameStore.berserkFired[caster.name][cityName]) {
      return { success: false, message: '该城市已使用过狂暴模式' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('狂暴模式', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // HP×5：直接提升城市HP，攻击力和防御均基于HP
    const origHp = selfCity.currentHp || selfCity.hp
    selfCity.currentHp = origHp * TUNE.kuangBaoMoShi.hpMultiplier
    if (selfCity.hp) selfCity.hp = selfCity.hp * TUNE.kuangBaoMoShi.hpMultiplier

    // 在gameStore中记录狂暴模式使用
    if (!gameStore.berserkFired[caster.name]) {
      gameStore.berserkFired[caster.name] = {}
    }
    gameStore.berserkFired[caster.name][cityName] = origHp

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '狂暴模式',
      `${caster.name}使用了狂暴模式，${selfCity.name} HP×5（${origHp} -> ${origHp * TUNE.kuangBaoMoShi.hpMultiplier}），回合结束将禁用5轮且血量降为一半`,
      `${caster.name}对 ${selfCity.name} 使用了狂暴模式`
    )

    return {
      success: true,
      message: `${selfCity.name}进入狂暴模式，HP×5`
    }
  }
}
