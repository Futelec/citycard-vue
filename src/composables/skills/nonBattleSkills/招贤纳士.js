/**
 * 金币技能：招贤纳士
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteZhaoXianNaShi(gameStore) {
  return function executeZhaoXianNaShi(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '招贤纳士')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '招贤纳士',
        `${caster.name}使用招贤纳士，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了招贤纳士`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('招贤纳士', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 找到己方当前HP≤2000的城市
    const myCitiesBelow2000 = Object.values(caster.cities)
      .filter(c => c && c.isAlive !== false && c.hp > 0 && c.hp <= TUNE.zhaoXianNaShi.maxCityHp)

    if (myCitiesBelow2000.length === 0) {
      return {
        success: false,
        message: '你没有HP小于等于2000的城市'
      }
    }

    // 随机抽取一座己方城市作为阈值
    const randomIdx = Math.floor(Math.random() * myCitiesBelow2000.length)
    const cityA = myCitiesBelow2000[randomIdx]
    const thresholdHp = cityA.hp

    // 找到对手所有HP低于阈值的城市（排除中心、钢铁、定海神针）
    const targetCities = []
    Object.entries(target.cities).forEach(([cityKey, city]) => {
      if (!city || city.isAlive === false) return
      if (city.isCenter) return // 排除中心城市

      // 排除谨慎交换集合中的城市
      if (gameStore.isInCautiousSet(target.name, cityKey)) return

      // 排除钢铁城市
      if (gameStore.hasIronShield(target.name, cityKey)) return

      // 排除定海神针城市
      if (gameStore.anchored[target.name] && gameStore.anchored[target.name][cityKey] > 0) return

      // 排除副中心城市（免疫效果）
      if (gameStore.isSubCenter(target.name, cityKey)) return

      // 检查HP是否小于阈值
      if (city.hp < thresholdHp) {
        targetCities.push({ city, index: cityKey })
      }
    })

    if (targetCities.length === 0) {
      return {
        success: false,
        message: `${target.name}没有符合条件的城市（HP<${Math.floor(thresholdHp)}且非中心/钢铁/定海神针/副中心城市）`
      }
    }

    // 抢夺这些城市
    const capturedNames = []
    const capturedKeys = targetCities.map(item => item.index)

    // 第一步：保存所有被抢夺城市的streak和changeFlagMark数据
    const savedData = []
    for (const item of targetCities) {
      const savedStreak = (target.streaks && target.streaks[item.index]) || 0
      const savedChangeFlagMark = (gameStore.changeFlagMark[target.name] && gameStore.changeFlagMark[target.name][item.index]) || null
      savedData.push({
        index: item.index,
        city: { ...item.city },
        streak: savedStreak,
        changeFlagMark: savedChangeFlagMark
      })
    }

    // 第二步：从target移除这些城市
    for (const cityKey of capturedKeys) {
      delete target.cities[cityKey]
      if (gameStore.initialCities[target.name]) {
        delete gameStore.initialCities[target.name][cityKey]
      }
    }

    // 第三步：更新target的roster、streaks、changeFlagMark
    if (gameStore.roster[target.name]) {
      gameStore.roster[target.name] = gameStore.roster[target.name]
        .filter(name => !capturedKeys.includes(name))
    }

    if (target.streaks) {
      for (const cityKey of capturedKeys) {
        delete target.streaks[cityKey]
      }
    }

    if (gameStore.changeFlagMark[target.name]) {
      for (const cityKey of capturedKeys) {
        delete gameStore.changeFlagMark[target.name][cityKey]
      }
    }

    // 第四步：将抢夺的城市添加到caster，并转移属性
    for (const data of savedData) {
      const city = data.city
      const newKey = city.name
      caster.cities[newKey] = city
      capturedNames.push(city.name)

      // 同步转移initialCities数据
      if (!gameStore.initialCities[caster.name]) {
        gameStore.initialCities[caster.name] = {}
      }
      gameStore.initialCities[caster.name][city.name] = {
        name: city.name,
        hp: city.hp,
        currentHp: city.hp,
        baseHp: city.hp,
        isAlive: true
      }

      // 转移疲劳streak
      if (!caster.streaks) caster.streaks = {}
      caster.streaks[newKey] = data.streak

      // 转移changeFlagMark
      if (data.changeFlagMark) {
        if (!gameStore.changeFlagMark[caster.name]) gameStore.changeFlagMark[caster.name] = {}
        gameStore.changeFlagMark[caster.name][newKey] = { ...data.changeFlagMark }
      }

      // 标记城市为已知
      gameStore.setCityKnown(caster.name, newKey, target.name)

      // 注意：不再将对手的城市标记为阵亡，因为我们已经用delete删除了它们
    }

    // 如果caster城市数≤5，自动加入roster
    if (Object.keys(caster.cities).length <= TUNE.zhaoXianNaShi.autoRosterMaxCities) {
      if (!gameStore.roster[caster.name]) {
        gameStore.roster[caster.name] = []
      }
      for (const cityName of capturedNames) {
        if (!gameStore.roster[caster.name].includes(cityName)) {
          gameStore.roster[caster.name].push(cityName)
        }
      }
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '招贤纳士（阈值${Math.floor(thresholdHp)}）',
      `${caster.name}使用招贤纳士（阈值${Math.floor(thresholdHp)}），抢夺了${target.name}的${capturedNames.length}座城市：${capturedNames.join('、')}`,
      `${caster.name}使用了招贤纳士（阈值${Math.floor(thresholdHp)}）`
    )

    return {
      success: true,
      message: `成功抢夺${capturedNames.length}座城市：${capturedNames.join('、')}`
    }
  }
}
