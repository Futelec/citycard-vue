/**
 * 金币技能：自相残杀
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteZiXiangCanSha(gameStore) {
  return function executeZiXiangCanSha(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查对手存活城市数量（至少需要3个）
    const aliveCitiesCount = Object.values(target.cities).filter(c => c && (c.currentHp || c.hp) > 0 && c.isAlive !== false).length
    if (aliveCitiesCount < TUNE.ziXiangCanSha.minAliveCities) {
      return {
        success: false,
        message: `对手城市数量不足（需要至少3个存活城市）`
      }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '自相残杀')) {
      addSkillUsageLog(
        gameStore,
        caster.name,
        '自相残杀',
        `${caster.name}使用自相残杀，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了自相残杀`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('自相残杀', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 获取非中心非钢铁的存活城市（副中心可被选中，但受到的伤害为0）
    const eligibleCities = []
    Object.entries(target.cities).forEach(([cityName, city]) => {
      if (!city || (city.currentHp || city.hp) <= 0 || city.isAlive === false) return
      if (cityName === target.centerCityName) return
      if (gameStore.ironCities?.[target.name]?.[cityName]) return
      eligibleCities.push(cityName)
    })

    if (eligibleCities.length < TUNE.ziXiangCanSha.minEligibleCities) {
      return {
        success: false,
        message: `可用的非中心非钢铁城市不足（需要至少2个）`
      }
    }

    // 随机选择两个不同的城市
    const firstCityKey = eligibleCities[Math.floor(Math.random() * eligibleCities.length)]
    const remainingCities = eligibleCities.filter(k => k !== firstCityKey)
    const secondCityKey = remainingCities[Math.floor(Math.random() * remainingCities.length)]

    const firstCity = target.cities[firstCityKey]
    const secondCity = target.cities[secondCityKey]

    const firstHp = firstCity.currentHp || firstCity.hp
    const secondHp = secondCity.currentHp || secondCity.hp

    // 检查副中心免疫
    const firstIsSubCenter = gameStore.isSubCenter(target.name, firstCityKey)
    const secondIsSubCenter = gameStore.isSubCenter(target.name, secondCityKey)

    // 互相攻击：副中心城市受到的伤害为0，另一座城市正常受到效果影响
    if (firstIsSubCenter && secondIsSubCenter) {
      // 两座都是副中心（理论上不会发生，每人只有1个副中心），无伤害
      gameStore.logs.push({
        message: `${caster.name}对${target.name}使用了自相残杀，${firstCity.name}与${secondCity.name}均为副中心城市，伤害无效`,
        timestamp: Date.now(),
        round: gameStore.currentRound,
        isPrivate: true,
        visibleTo: [target.name]
      })
    } else if (firstIsSubCenter) {
      // 第一座是副中心，免疫伤害；第二座正常被第一座攻击
      secondCity.isAlive = false
      secondCity.currentHp = 0

      if (!gameStore.deadCities[target.name]) {
        gameStore.deadCities[target.name] = []
      }
      if (!gameStore.deadCities[target.name].includes(secondCityKey)) {
        gameStore.deadCities[target.name].push(secondCityKey)
      }

      gameStore.logs.push({
        message: `${caster.name}对${target.name}使用了自相残杀，${firstCity.name}（副中心，免疫伤害）与${secondCity.name}（${Math.floor(secondHp)}）互相攻击，${secondCity.name}阵亡`,
        timestamp: Date.now(),
        round: gameStore.currentRound,
        isPrivate: true,
        visibleTo: [target.name]
      })
    } else if (secondIsSubCenter) {
      // 第二座是副中心，免疫伤害；第一座正常被第二座攻击
      firstCity.isAlive = false
      firstCity.currentHp = 0

      if (!gameStore.deadCities[target.name]) {
        gameStore.deadCities[target.name] = []
      }
      if (!gameStore.deadCities[target.name].includes(firstCityKey)) {
        gameStore.deadCities[target.name].push(firstCityKey)
      }

      gameStore.logs.push({
        message: `${caster.name}对${target.name}使用了自相残杀，${firstCity.name}（${Math.floor(firstHp)}）与${secondCity.name}（副中心，免疫伤害）互相攻击，${firstCity.name}阵亡`,
        timestamp: Date.now(),
        round: gameStore.currentRound,
        isPrivate: true,
        visibleTo: [target.name]
      })
    } else if (firstHp < secondHp) {
      firstCity.isAlive = false
      firstCity.currentHp = 0
      secondCity.currentHp = secondHp - firstHp

      if (!gameStore.deadCities[target.name]) {
        gameStore.deadCities[target.name] = []
      }
      if (!gameStore.deadCities[target.name].includes(firstCityKey)) {
        gameStore.deadCities[target.name].push(firstCityKey)
      }

      gameStore.logs.push({
        message: `${caster.name}对${target.name}使用了自相残杀，${firstCity.name}（${Math.floor(firstHp)}）与${secondCity.name}（${Math.floor(secondHp)}）互相攻击，${firstCity.name}阵亡，${secondCity.name}剩余${Math.floor(secondCity.currentHp)}HP`,
        timestamp: Date.now(),
        round: gameStore.currentRound,
        isPrivate: true,
        visibleTo: [target.name]
      })
    } else if (firstHp > secondHp) {
      secondCity.isAlive = false
      secondCity.currentHp = 0
      firstCity.currentHp = firstHp - secondHp

      if (!gameStore.deadCities[target.name]) {
        gameStore.deadCities[target.name] = []
      }
      if (!gameStore.deadCities[target.name].includes(secondCityKey)) {
        gameStore.deadCities[target.name].push(secondCityKey)
      }

      gameStore.logs.push({
        message: `${caster.name}对${target.name}使用了自相残杀，${firstCity.name}（${Math.floor(firstHp)}）与${secondCity.name}（${Math.floor(secondHp)}）互相攻击，${secondCity.name}阵亡，${firstCity.name}剩余${Math.floor(firstCity.currentHp)}HP`,
        timestamp: Date.now(),
        round: gameStore.currentRound,
        isPrivate: true,
        visibleTo: [target.name]
      })
    } else {
      firstCity.isAlive = false
      firstCity.currentHp = 0
      secondCity.isAlive = false
      secondCity.currentHp = 0

      if (!gameStore.deadCities[target.name]) {
        gameStore.deadCities[target.name] = []
      }
      if (!gameStore.deadCities[target.name].includes(firstCityKey)) {
        gameStore.deadCities[target.name].push(firstCityKey)
      }
      if (!gameStore.deadCities[target.name].includes(secondCityKey)) {
        gameStore.deadCities[target.name].push(secondCityKey)
      }

      gameStore.logs.push({
        message: `${caster.name}对${target.name}使用了自相残杀，${firstCity.name}与${secondCity.name}HP相等（${Math.floor(firstHp)}），同归于尽`,
        timestamp: Date.now(),
        round: gameStore.currentRound,
        isPrivate: true,
        visibleTo: [target.name]
      })
    }

    // 公开日志和施法者私密日志：不显示城市名（对手城市对施法者未知）
    addSkillUsageLog(
      gameStore,
      caster.name,
      '自相残杀',
      `${caster.name}对${target.name}使用了自相残杀`,
      `${caster.name}对${target.name}使用了自相残杀`
    )

    return {
      success: true,
      message: `对${target.name}使用了自相残杀`,
      hidePublicLog: true
    }
  }
}
