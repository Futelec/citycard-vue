/**
 * 金币技能：博学多才
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteBoXueDuoCai(gameStore) {
  return function executeBoXueDuoCai(caster, cityName, correctCount = 0, options = {}) {
    if (cityName === undefined) {
      return { success: false, message: '未选择城市' }
    }

    let selfCity = caster.cities[cityName]
    let cityKey = cityName

    if (!selfCity) {
      return { success: false, message: '目标城市不存在' }
    }

    // 金币检查和扣除（skipGold用于拦截流程后的答题阶段，金币已在准备阶段扣除）
    if (!options.skipGold) {
      const goldCheck = checkAndDeductGold('博学多才', caster, gameStore)
      if (!goldCheck.success) {
        return goldCheck
      }
    }

    // 准备阶段：只扣金币，答题在拦截流程之后进行
    if (correctCount < 0) {
      addSkillUsageLog(
        gameStore,
        caster.name,
        '博学多才',
        `${caster.name}使用了博学多才`,
        `${caster.name}使用了博学多才`
      )
      return { success: true, message: '博学多才已发动，等待答题', needsQuiz: true }
    }

    // 验证答对数量
    if (typeof correctCount !== 'number' || correctCount < 0 || correctCount > TUNE.boXueDuoCai.questionCount) {
      correctCount = 0
    }

    // 计算HP倍数：0题x1, 1题x1.25, 2题x1.75, 3题x2.5
    const hpMultipliers = TUNE.boXueDuoCai.multipliers
    const multiplier = hpMultipliers[correctCount]

    // 应用HP倍数
    const currentHp = selfCity.currentHp || selfCity.hp
    const oldHp = currentHp
    selfCity.currentHp = Math.floor(currentHp * multiplier)

    // 应用HP上限（如果gameStore有上限功能）
    if (gameStore.applyPlayerHpCap) {
      gameStore.applyPlayerHpCap(caster.name, cityKey, selfCity)
    }

    const hpGain = selfCity.currentHp - oldHp

    // 获取显示名称（处理狐假虎威伪装）
    let displayCityName = selfCity.name
    if (gameStore.disguisedCities &&
        gameStore.disguisedCities[caster.name] &&
        gameStore.disguisedCities[caster.name][cityKey]) {
      const disguise = gameStore.disguisedCities[caster.name][cityKey]
      if (disguise.roundsLeft > 0) {
        displayCityName = disguise.disguiseAsName || selfCity.name
      }
    }

    // 添加日志
    const resultSummary = `答对${correctCount}题，HP×${multiplier}（${Math.floor(oldHp)} → ${selfCity.currentHp}，+${hpGain}）`

    if (gameStore.addPrivateLog) {
      gameStore.addPrivateLog(caster.name, `你对${displayCityName}使用了博学多才：${resultSummary}`)
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '博学多才',
      `${caster.name}使用了博学多才`,
      `${caster.name}使用了博学多才`
    )


    return {
      success: true,
      message: `博学多才：${resultSummary}`,
      data: {
        cityName: displayCityName,
        correctCount: correctCount,
        multiplier: multiplier,
        oldHp: oldHp,
        newHp: selfCity.currentHp,
        hpGain: hpGain
      }
    }
  }
}
