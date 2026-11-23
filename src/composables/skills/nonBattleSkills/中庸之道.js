/**
 * 金币技能：中庸之道
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteZhongYongZhiDao(gameStore) {
  return function executeZhongYongZhiDao(caster) {
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('中庸之道', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    const mode = gameStore.gameMode || '2P'
    const affectedCities = []

    // 处理己方所有HP<10000的城市
    Object.values(caster.cities).forEach((city, idx) => {
      if (city && city.isAlive !== false && (city.currentHp || city.hp) > 0 && (city.currentHp || city.hp) < TUNE.zhongYongZhiDao.hpThreshold) {
        const oldHp = city.currentHp || city.hp
        const newHp = Math.floor(Math.sqrt(oldHp) * TUNE.zhongYongZhiDao.sqrtMultiplier)
        city.currentHp = newHp

        affectedCities.push({
          player: caster.name,
          cityName: city.name,
          oldHp: Math.round(oldHp),
          newHp: newHp,
          type: '己方低HP'
        })
      }
    })

    // 处理全部对手所有HP>10000的城市
    gameStore.players.forEach(player => {
      if (player.name === caster.name) return

      // 在2v2模式下，跳过队友
      if (mode === '2v2' && player.team === caster.team) return

      // 检查坚不可摧护盾
      if (gameStore.isBlockedByJianbukecui(player.name, caster.name, '中庸之道')) {
        // 双日志
        addSkillUsageLog(
          gameStore,
          caster.name,
          '中庸之道',
          `${caster.name}对${player.name}使用了中庸之道，但被坚不可摧护盾阻挡`,
          `${caster.name}使用了中庸之道`
        )
        return
      }

      Object.entries(player.cities).forEach(([cityName, city]) => {
        if (city && city.isAlive !== false && (city.currentHp || city.hp) > 0 && (city.currentHp || city.hp) > TUNE.zhongYongZhiDao.hpThreshold) {
          // 跳过对手的副中心城市（免疫效果）
          if (gameStore.isSubCenter(player.name, cityName)) return

          // 检查海市蜃楼拦截（如果目标是中心城市）
          const is2pOr2v2 = (mode === '2P' || mode === '2v2')
          const centerName = is2pOr2v2 ? player.centerCityName : null
          const isCenter = is2pOr2v2 && cityName === centerName

          if (isCenter && gameStore.mirage && gameStore.mirage[player.name] &&
              gameStore.mirage[player.name].roundsLeft > 0) {
            // 检查75%概率拦截
            if (Math.random() < TUNE.zhongYongZhiDao.mirageBlockRate) {
              gameStore.mirage[player.name].blocked++
              affectedCities.push({
                player: player.name,
                cityName: city.name,
                oldHp: Math.round(city.currentHp || city.hp),
                newHp: Math.round(city.currentHp || city.hp),
                type: '被海市蜃楼拦截'
              })
              return
            }
          }

          const oldHp = city.currentHp || city.hp
          const newHp = Math.floor(Math.sqrt(oldHp) * TUNE.zhongYongZhiDao.sqrtMultiplier)
          city.currentHp = newHp

          affectedCities.push({
            player: player.name,
            cityName: city.name,
            oldHp: Math.round(oldHp),
            newHp: newHp,
            type: '对手高HP'
          })
        }
      })
    })

    // 公开日志：不显示具体HP变化
    addSkillUsageLog(
      gameStore,
      caster.name,
      '中庸之道',
      `${caster.name}使用了中庸之道，影响${affectedCities.length}座城市`,
      `${caster.name}使用了中庸之道`
    )

    // 按玩家分组，每个玩家只能看到自己城市的HP变化
    const byPlayer = {}
    affectedCities.forEach(c => {
      if (!byPlayer[c.player]) byPlayer[c.player] = []
      byPlayer[c.player].push(c)
    })
    for (const [playerName, cities] of Object.entries(byPlayer)) {
      const playerSummary = cities.map(c => `${c.cityName}: ${c.oldHp}→${c.newHp}`).join('；')
      gameStore.addPrivateLog(playerName, `（中庸之道）${playerSummary}`)
    }

    return {
      success: true,
      message: `中庸之道生效！影响了${affectedCities.length}座城市`,
      hidePublicLog: true,
      data: {
        affectedCities: affectedCities
      }
    }
  }
}
