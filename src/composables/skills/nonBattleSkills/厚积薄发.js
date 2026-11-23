/**
 * 金币技能：厚积薄发
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteHouJiBaoFa(gameStore) {
  return function executeHouJiBaoFa(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    const targetCityName = selfCity.name
    if (!caster.cities[targetCityName]) {
      return { success: false, message: '城市不存在' }
    }

    const mode = gameStore.gameMode || '2P'
    const is2p = (mode === '2P')
    const is2v2 = (mode === '2v2')
    const centerName = (is2p || is2v2) ? caster.centerCityName : null

    // 检查是否为中心城市
    if ((is2p || is2v2) && targetCityName === centerName) {
      return { success: false, message: '不能对中心城市使用厚积薄发！' }
    }

    // 检查城市是否满血
    const currentHp = selfCity.currentHp || selfCity.hp
    const initialHp = gameStore.initialCities &&
                      gameStore.initialCities[caster.name] &&
                      gameStore.initialCities[caster.name][targetCityName] ?
                      gameStore.initialCities[caster.name][targetCityName].hp :
                      selfCity.hp

    if (Math.abs(currentHp - initialHp) > TUNE.houJiBaoFa.hpTolerance) {
      return { success: false, message: '该城市当前HP不等于初始HP，无法使用厚积薄发！' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('厚积薄发', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 初始化厚积薄发状态
    if (!gameStore.hjbf) {
      gameStore.hjbf = {}
    }
    if (!gameStore.hjbf[caster.name]) {
      gameStore.hjbf[caster.name] = {}
    }

    // 设置厚积薄发效果
    gameStore.hjbf[caster.name][targetCityName] = {
      roundsLeft: TUNE.houJiBaoFa.rounds,
      originalHp: currentHp,
      active: true
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '厚积薄发',
      `${caster.name}对${selfCity.name}使用了厚积薄发，攻击力降为1，5回合后HP永久×5`,
      `${caster.name}使用了厚积薄发`
    )

    return {
      success: true,
      message: `${selfCity.name}进入厚积薄发状态，攻击力降为1，5回合后HP将永久×5`
    }
  }
}
