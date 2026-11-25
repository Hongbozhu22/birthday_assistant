import { useEffect, useMemo, useState } from 'react'

const PRICE_BUCKETS = [
  { key: 'all', label: '全部', min: 0, max: Infinity },
  { key: '0-100', label: '0-100 元', min: 0, max: 100 },
  { key: '100-300', label: '100-300 元', min: 100, max: 300 },
  { key: '300-500', label: '300-500 元', min: 300, max: 500 },
  { key: '500+', label: '500 元以上', min: 500, max: Infinity }
]

const SEARCH_HINTS = ['足球', '咖啡', '通勤', '露营', '香水', '高性价比']

const RECIPIENT_OPTIONS = ['朋友', '恋人', '父母', '长辈', '同事', '孩子', '自己']

const OCCASION_OPTIONS = ['生日', '节日', '纪念日', '日常惊喜', '感谢', '乔迁']

const WAREHOUSE_TABS = [
  { key: 'all', label: '全部' },
  { key: 'wishlist', label: '想送' },
  { key: 'gifted', label: '已送' },
  { key: 'trash', label: '已删除' }
]

function daysInMonth(month) {
  if (!month) return 31
  return new Date(Date.UTC(2024, Number(month), 0)).getUTCDate()
}

async function fetchJson(url, options) {
  const response = await fetch(url, options)
  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  if (!response.ok) {
    const error = new Error(payload?.error || `接口返回 ${response.status}`)
    error.status = response.status
    throw error
  }
  return payload
}

function pronounOf(friend) {
  if (friend?.gender === 'male') return '他'
  if (friend?.gender === 'female') return '她'
  return '他/她'
}

function App() {
  const [status, setStatus] = useState('loading')
  const [giftsData, setGiftsData] = useState(null)
  const [friendsData, setFriendsData] = useState(null)
  const [favoritesData, setFavoritesData] = useState(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [view, setView] = useState('birthdays')
  const [detailGiftId, setDetailGiftId] = useState(null)
  const [selectedFriendId, setSelectedFriendId] = useState(null)

  const [form, setForm] = useState({
    name: '',
    month: '',
    day: '',
    year: '',
    gender: ''
  })
  const [formState, setFormState] = useState({
    submitting: false,
    type: '',
    message: ''
  })

  const [selectedTagIds, setSelectedTagIds] = useState(() => new Set())
  const [keyword, setKeyword] = useState('')
  const [typeKey, setTypeKey] = useState(null)
  const [recipientKey, setRecipientKey] = useState(null)
  const [interestKey, setInterestKey] = useState(null)
  const [occasionKey, setOccasionKey] = useState(null)
  const [expandedTags, setExpandedTags] = useState(() => new Set())
  const [priceKey, setPriceKey] = useState('all')

  const [favoritePending, setFavoritePending] = useState(null)
  const [warehouseTab, setWarehouseTab] = useState('all')
  const [toast, setToast] = useState(null)

  const [authStatus, setAuthStatus] = useState('checking')
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchJson('/api/auth/me', { signal: controller.signal })
      .then((payload) => {
        setUser(payload.user)
        setAuthStatus('authed')
      })
      .catch((authFetchError) => {
        if (authFetchError.name === 'AbortError') return
        if (authFetchError.status === 401) {
          setUser(null)
          setAuthStatus('guest')
          return
        }
        setAuthError(authFetchError.message || '无法连接登录服务')
        setAuthStatus('guest')
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!user) {
      setStatus('idle')
      setGiftsData(null)
      setFriendsData(null)
      setFavoritesData(null)
      return
    }

    const controller = new AbortController()
    setStatus('loading')
    setError('')

    Promise.all([
      fetchJson('/api/gifts', { signal: controller.signal }),
      fetchJson('/api/friends', { signal: controller.signal }),
      fetchJson('/api/favorites', { signal: controller.signal })
    ])
      .then(([catalog, friends, favorites]) => {
        if (!Array.isArray(catalog?.gifts) || !Array.isArray(catalog?.tags)) {
          throw new Error('礼物接口数据结构不符合预期')
        }
        if (!Array.isArray(friends?.friends)) {
          throw new Error('好友接口数据结构不符合预期')
        }
        if (!Array.isArray(favorites?.favorites) || !Array.isArray(favorites?.deleted)) {
          throw new Error('仓库接口数据结构不符合预期')
        }
        setGiftsData(catalog)
        setFriendsData(friends)
        setFavoritesData(favorites)
        setStatus('ready')
      })
      .catch((fetchError) => {
        if (fetchError.name === 'AbortError') return
        if (fetchError.status === 401) {
          setUser(null)
          setAuthStatus('guest')
          return
        }
        setError(fetchError.message || '未知错误')
        setStatus('error')
      })

    return () => controller.abort()
  }, [user, reloadKey])

  useEffect(() => {
    const isBirthdayView = status === 'ready' && view === 'birthdays'
    document.body.classList.toggle('birthday-view', isBirthdayView)
    return () => document.body.classList.remove('birthday-view')
  }, [status, view])

  const friends = friendsData?.friends ?? []
  const nearest = friends[0] ?? null
  const todayFriends = friends.filter((friend) => friend.isToday)
  const allTags = giftsData?.tags ?? []

  const activeFavorites = favoritesData?.favorites ?? []
  const deletedFavorites = favoritesData?.deleted ?? []
  const wishlistCount = activeFavorites.filter(
    (favorite) => favorite.status === 'wishlist'
  ).length
  const giftedCount = activeFavorites.filter(
    (favorite) => favorite.status === 'gifted'
  ).length

  const favoriteByGiftId = useMemo(
    () => new Map(activeFavorites.map((favorite) => [favorite.giftId, favorite])),
    [activeFavorites]
  )

  const warehouseItems = useMemo(() => {
    if (warehouseTab === 'wishlist') {
      return activeFavorites.filter((favorite) => favorite.status === 'wishlist')
    }
    if (warehouseTab === 'gifted') {
      return activeFavorites.filter((favorite) => favorite.status === 'gifted')
    }
    if (warehouseTab === 'trash') return deletedFavorites
    return activeFavorites
  }, [warehouseTab, activeFavorites, deletedFavorites])

  const thisMonth = friendsData
    ? Number(friendsData.today.slice(5, 7))
    : new Date().getMonth() + 1
  const thisMonthCount = friends.filter(
    (friend) => friend.birthMonth === thisMonth
  ).length
  const soonCount = friends.filter((friend) => friend.daysUntil <= 30).length

  const rootTags = useMemo(
    () => allTags.filter((tag) => tag.parentId == null),
    [allTags]
  )

  const childrenByParent = useMemo(() => {
    const map = new Map()
    for (const tag of allTags) {
      if (tag.parentId == null) continue
      const list = map.get(tag.parentId) ?? []
      list.push(tag)
      map.set(tag.parentId, list)
    }
    return map
  }, [allTags])

  const tagCounts = useMemo(() => {
    const counts = new Map()
    for (const gift of giftsData?.gifts ?? []) {
      for (const tag of gift.tags) {
        counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1)
      }
    }
    return counts
  }, [giftsData])

  const selectedTags = useMemo(
    () => allTags.filter((tag) => selectedTagIds.has(tag.id)),
    [allTags, selectedTagIds]
  )

  const styleTags = useMemo(() => {
    const styleRoot = allTags.find(
      (tag) => tag.parentId == null && tag.name === '风格'
    )
    if (!styleRoot) return []
    return allTags.filter((tag) => tag.parentId === styleRoot.id)
  }, [allTags])

  const activeTypeTag = useMemo(
    () => styleTags.find((tag) => tag.id === typeKey) ?? null,
    [styleTags, typeKey]
  )

  const interestTags = useMemo(
    () => rootTags.filter((tag) => tag.name !== '风格'),
    [rootTags]
  )

  const activeInterestTag = useMemo(
    () => interestTags.find((tag) => tag.id === interestKey) ?? null,
    [interestTags, interestKey]
  )

  const activePrice = useMemo(
    () => PRICE_BUCKETS.find((bucket) => bucket.key === priceKey) ?? PRICE_BUCKETS[0],
    [priceKey]
  )

  const filteredGifts = useMemo(() => {
    const gifts = giftsData?.gifts ?? []
    const terms = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean)

    return gifts.filter((gift) => {
      if (terms.length > 0) {
        const haystack = [
          gift.name,
          gift.category,
          gift.fitFor,
          gift.reason,
          gift.priceLabel,
          ...gift.tags.map((tag) => tag.name)
        ]
          .join(' ')
          .toLowerCase()
        if (!terms.every((term) => haystack.includes(term))) return false
      }

      if (
        recipientKey &&
        !(gift.recipients ?? []).includes(recipientKey)
      ) {
        return false
      }

      if (occasionKey && !(gift.occasions ?? []).includes(occasionKey)) {
        return false
      }

      if (
        interestKey &&
        !gift.tags.some((giftTag) => giftTag.id === interestKey)
      ) {
        return false
      }

      if (
        activeTypeTag &&
        !gift.tags.some((giftTag) => giftTag.id === activeTypeTag.id)
      ) {
        return false
      }

      if (activePrice.key === 'all') return true
      return (
        gift.priceMin < activePrice.max && gift.priceMax > activePrice.min
      )
    })
  }, [
    giftsData,
    activePrice,
    keyword,
    recipientKey,
    occasionKey,
    interestKey,
    activeTypeTag
  ])

  function showView(nextView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleAuthed(nextUser) {
    setUser(nextUser)
    setAuthStatus('authed')
    setAuthError('')
    setStatus('loading')
    setView('birthdays')
    setDetailGiftId(null)
  }

  async function handleLogout() {
    try {
      await fetchJson('/api/auth/logout', { method: 'POST' })
    } catch {
      // 即使接口失败也在前端退出
    } finally {
      clearClientSession()
    }
  }

  function clearClientSession() {
    setUser(null)
    setAuthStatus('guest')
    setAuthError('')
    setStatus('idle')
    setGiftsData(null)
    setFriendsData(null)
    setFavoritesData(null)
    setView('birthdays')
    setDetailGiftId(null)
    setSelectedTagIds(new Set())
    setPriceKey('all')
    setKeyword('')
    setTypeKey(null)
    setRecipientKey(null)
    setInterestKey(null)
    setOccasionKey(null)
    setToast(null)
    setAccountOpen(false)
    setSelectedFriendId(null)
  }

  function openGift(giftId) {
    setDetailGiftId(giftId)
    showView('detail')
  }

  const detailGift = giftsData?.gifts?.find((gift) => gift.id === detailGiftId) ?? null

  function updateForm(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
    setFormState((previous) => ({ ...previous, message: '', type: '' }))
  }

  function handleMonthChange(value) {
    const maxDay = daysInMonth(value)
    setForm((previous) => ({
      ...previous,
      month: value,
      day:
        previous.day && Number(previous.day) > maxDay ? '' : previous.day
    }))
    setFormState((previous) => ({ ...previous, message: '', type: '' }))
  }

  async function refreshFriends() {
    const payload = await fetchJson('/api/friends')
    setFriendsData(payload)
  }

  async function refreshFavorites() {
    const payload = await fetchJson('/api/favorites')
    setFavoritesData(payload)
  }

  async function handleFriendGender(friendId, gender) {
    try {
      await fetchJson(`/api/friends/${friendId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender: gender || null })
      })
      await refreshFriends()
      showToast('性别已更新')
    } catch (genderError) {
      showToast(genderError.message || '性别更新失败', 'error')
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
    window.setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current))
    }, 3200)
  }

  async function handleFavorite(gift) {
    if (favoriteByGiftId.has(gift.id)) return
    setFavoritePending(gift.id)
    try {
      await fetchJson('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId: gift.id })
      })
      await refreshFavorites()
      showToast(`已加入仓库：${gift.name}`)
    } catch (favoriteError) {
      showToast(favoriteError.message || '收藏失败，请重试', 'error')
    } finally {
      setFavoritePending(null)
    }
  }

  async function handleFavoriteUpdate(favoriteId, patch) {
    try {
      const payload = await fetchJson(`/api/favorites/${favoriteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      })
      await refreshFavorites()
      showToast('仓库信息已更新')
      return payload.favorite
    } catch (updateError) {
      showToast(updateError.message || '保存失败，请重试', 'error')
      throw updateError
    }
  }

  async function handleFavoriteDelete(favoriteId) {
    try {
      await fetchJson(`/api/favorites/${favoriteId}`, { method: 'DELETE' })
      await refreshFavorites()
      showToast('已移入删除区，可以随时恢复')
    } catch (deleteError) {
      showToast(deleteError.message || '删除失败，请重试', 'error')
      throw deleteError
    }
  }

  async function handleFavoriteRestore(favoriteId) {
    try {
      await fetchJson(`/api/favorites/${favoriteId}/restore`, { method: 'POST' })
      await refreshFavorites()
      showToast('已恢复这件礼物')
    } catch (restoreError) {
      showToast(restoreError.message || '恢复失败，请重试', 'error')
      throw restoreError
    }
  }

  async function handleAddFriend(event) {
    event.preventDefault()

    if (!form.name.trim()) {
      setFormState({ submitting: false, type: 'error', message: '请填写好友姓名' })
      return
    }
    if (!form.month || !form.day) {
      setFormState({ submitting: false, type: 'error', message: '请选择月和日' })
      return
    }

    setFormState({ submitting: true, type: '', message: '' })
    try {
      const payload = await fetchJson('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          month: Number(form.month),
          day: Number(form.day),
          year: form.year ? Number(form.year) : null,
          gender: form.gender || null
        })
      })
      setForm({ name: '', month: '', day: '', year: '', gender: '' })
      setFormState({
        submitting: false,
        type: 'success',
        message: `已记下 ${payload.friend.name} 的生日：${payload.friend.birthdayLabel}。`
      })
      await refreshFriends()
    } catch (submitError) {
      setFormState({
        submitting: false,
        type: 'error',
        message: submitError.message || '保存失败，请重试'
      })
    }
  }

  function toggleTag(tagId) {
    setSelectedTagIds((previous) => {
      const next = new Set(previous)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  function toggleExpand(rootId) {
    setExpandedTags((previous) => {
      const next = new Set(previous)
      if (next.has(rootId)) next.delete(rootId)
      else next.add(rootId)
      return next
    })
  }

  function expandAllTags() {
    setExpandedTags(new Set(rootTags.map((tag) => tag.id)))
  }

  function clearFilters() {
    setSelectedTagIds(new Set())
    setPriceKey('all')
    setKeyword('')
    setTypeKey(null)
    setRecipientKey(null)
    setInterestKey(null)
    setOccasionKey(null)
  }

  if (authStatus === 'checking') return <AuthLoading />
  if (!user) return <AuthScreen onAuthed={handleAuthed} initialError={authError} />

  return (
    <div
      className={`app ${status === 'ready' && view === 'birthdays' ? 'is-birthday-view' : ''}`}
    >
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="/">
          <img
            className="brand-mark"
            src="/brand-icon-96.png"
            alt=""
            aria-hidden="true"
          />
          <span className="brand-text">
            <strong>礼物助手</strong>
            <small>Gift Assistant</small>
          </span>
        </a>

        <div className="topbar-right">
          <nav className="topbar-nav" aria-label="主导航">
            <button
              type="button"
              className={`topbar-link ${view === 'birthdays' ? 'is-active' : ''}`}
              aria-current={view === 'birthdays' ? 'page' : undefined}
              onClick={() => showView('birthdays')}
            >
              生日日历
            </button>
            <button
              type="button"
              className={`topbar-link ${view === 'search' || view === 'detail' ? 'is-active' : ''}`}
              aria-current={view === 'search' || view === 'detail' ? 'page' : undefined}
              onClick={() => showView('search')}
            >
              找礼物
            </button>
            <button
              type="button"
              className={`topbar-link ${view === 'warehouse' ? 'is-active' : ''}`}
              aria-current={view === 'warehouse' ? 'page' : undefined}
              onClick={() => showView('warehouse')}
            >
              仓库
            </button>
          </nav>
          <button
            className="account-button"
            type="button"
            onClick={() => setAccountOpen(true)}
            title={user.email}
          >
            <span className="account-avatar" aria-hidden="true">
              {user.email.slice(0, 1).toUpperCase()}
            </span>
            <span className="account-email">{user.email}</span>
          </button>
        </div>
      </header>

      <main>
        {status === 'loading' && (
          <>
            <LoadingPanel />

          </>
        )}

        {status === 'error' && (
          <>
            <section className="panel error-panel" role="alert">
              <div>
                <p className="panel-kicker">接口异常</p>
                <h2>没能读到本地数据</h2>
                <p className="panel-text">
                  {error}。请确认开发服务器仍在运行，然后重试。
                </p>
              </div>
              <button
                className="button button-primary"
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                重新加载
              </button>
            </section>

          </>
        )}

        {status === 'ready' && view === 'birthdays' && (
          <section className="birthday-page" id="birthdays">
            <div className="birthday-page-head">
              <div className="birthday-page-title">
                <h1>生日日历</h1>
                <p className="birthday-summary">
                  {friends.length} 位好友 · 本月 {thisMonthCount} 人 · 30 天内{' '}
                  {soonCount} 人
                </p>
              </div>
              <div className="birthday-page-actions">
                <a className="birthday-add-link" href="#add-friend">
                  添加好友
                </a>
                <span className="birthday-sort">按剩余天数排序</span>
              </div>
            </div>

            <div className="birthday-workspace">
              <section className="birthday-list" aria-label="生日倒计时列表">
                <div className="birthday-list-head" aria-hidden="true">
                  <span />
                  <span>好友</span>
                  <span>生日</span>
                  <span>剩余</span>
                </div>

                {friends.length > 0 ? (
                  <ul className="birthday-rows">
                    {friends.map((friend) => (
                      <FriendRow
                        friend={friend}
                        key={friend.id}
                        selected={selectedFriendId === friend.id}
                        onSelect={setSelectedFriendId}
                        onGenderChange={handleFriendGender}
                      />
                    ))}
                  </ul>
                ) : (
                  <div className="birthday-empty">
                    <span className="birthday-empty-emoji" aria-hidden="true">
                      🎂
                    </span>
                    <p>还没有好友生日</p>
                    <small>
                      在添加表单里填写姓名和月 / 日，列表会自动按剩余天数排序。
                    </small>
                  </div>
                )}
              </section>

              <aside className="birthday-form" id="add-friend">
                <h2>添加好友</h2>
                <p className="birthday-form-lead">手动记录生日，年份可选。</p>

                <form className="birthday-friend-form" onSubmit={handleAddFriend}>
                  <label className="field">
                    <span>姓名</span>
                    <input
                      type="text"
                      value={form.name}
                      maxLength={30}
                      placeholder="例如：张三"
                      onChange={(event) => updateForm('name', event.target.value)}
                      autoComplete="off"
                    />
                  </label>

                  <div className="field-row">
                    <label className="field">
                      <span>月</span>
                      <select
                        value={form.month}
                        onChange={(event) => handleMonthChange(event.target.value)}
                      >
                        <option value="">月份</option>
                        {Array.from({ length: 12 }, (_, index) => index + 1).map(
                          (month) => (
                            <option value={month} key={month}>
                              {month} 月
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="field">
                      <span>日</span>
                      <select
                        value={form.day}
                        onChange={(event) => updateForm('day', event.target.value)}
                      >
                        <option value="">日期</option>
                        {Array.from(
                          { length: daysInMonth(form.month) },
                          (_, index) => index + 1
                        ).map((day) => (
                          <option value={day} key={day}>
                            {day} 日
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="field-row">
                    <label className="field">
                      <span>性别</span>
                      <select
                        value={form.gender}
                        onChange={(event) => updateForm('gender', event.target.value)}
                      >
                        <option value="">不填</option>
                        <option value="male">男</option>
                        <option value="female">女</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>
                        年份 <em>可选</em>
                      </span>
                      <input
                        type="number"
                        value={form.year}
                        min={1900}
                        max={new Date().getFullYear()}
                        placeholder="例如 1995"
                        onChange={(event) => updateForm('year', event.target.value)}
                      />
                    </label>
                  </div>

                  <button
                    className="birthday-submit"
                    type="submit"
                    disabled={formState.submitting}
                  >
                    {formState.submitting ? '保存中…' : '记下生日'}
                  </button>

                  {formState.message && (
                    <p
                      className={`birthday-form-message ${formState.type}`}
                      role="status"
                    >
                      {formState.message}
                    </p>
                  )}

                  <p className="birthday-form-hint">
                    填了年份会显示将满几岁；不填也能正常提醒生日。
                  </p>
                </form>
              </aside>
            </div>

            <p className="birthday-note">数据保存在你的账号内 · 价格仅为品类参考</p>
          </section>
        )}


        {status === 'ready' && view === 'search' && (
          <>
            <section className="search-page">
              <div className="workbench-head">
                <div>
                  <h1>找礼物</h1>
                  <p className="page-summary">
                    {giftsData.total} 件礼物 · 当前 {filteredGifts.length} 件符合
                  </p>
                </div>
                <span className="page-meta">对象 · 预算 · 类型 · 兴趣 · 场合</span>
              </div>

              <div className="search-hero">
                <div>
                  <p className="eyebrow">
                    <span className="eyebrow-dot" aria-hidden="true" />
                    TAG SEARCH · 非商业品类参考
                  </p>
                  <h1>
                    按喜好，
                    <em>筛出礼物</em>。
                  </h1>
                  <p className="search-lead">
                    标签是交集关系：同时选中“运动”和“足球”，只会留下两者都符合的礼物。
                    价格只用于缩小品类范围，不是实时售价。
                  </p>
                </div>

                <div className="search-summary" aria-label="筛选概览">
                  <div>
                    <strong>{filteredGifts.length}</strong>
                    <span>符合条件</span>
                  </div>
                  <div>
                    <strong>{selectedTagIds.size}</strong>
                    <span>已选标签</span>
                  </div>
                  <div>
                    <strong>{giftsData.total}</strong>
                    <span>全部礼物</span>
                  </div>
                </div>
              </div>

                            <div className="facet-search">
                <div className="search-input-row">
                  <div className="search-input-wrap">
                    <input
                      className="search-input"
                      type="search"
                      value={keyword}
                      placeholder="搜礼物、兴趣或场景，如 足球 / 咖啡 / 通勤"
                      aria-label="搜索礼物"
                      onChange={(event) => setKeyword(event.target.value)}
                    />
                    {keyword && (
                      <button
                        className="search-clear"
                        type="button"
                        aria-label="清空搜索"
                        onClick={() => setKeyword('')}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {!keyword && (
                  <div className="search-hints">
                    <span>试试</span>
                    {SEARCH_HINTS.map((hint) => (
                      <button
                        type="button"
                        key={hint}
                        onClick={() => setKeyword(hint)}
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                )}

                <div className="facet-panel">
                  <FacetRow
                    label="送给谁"
                    options={RECIPIENT_OPTIONS}
                    value={recipientKey}
                    onChange={setRecipientKey}
                  />
                  <FacetRow
                    label="预算"
                    options={PRICE_BUCKETS.filter((bucket) => bucket.key !== 'all').map(
                      (bucket) => ({ value: bucket.key, label: bucket.label })
                    )}
                    value={priceKey === 'all' ? null : priceKey}
                    onChange={(next) => setPriceKey(next ?? 'all')}
                  />
                  <FacetRow
                    label="类型"
                    options={styleTags.map((tag) => ({
                      value: tag.id,
                      label: tag.name
                    }))}
                    value={typeKey}
                    onChange={setTypeKey}
                  />
                  <FacetRow
                    label="兴趣"
                    options={interestTags.map((tag) => ({
                      value: tag.id,
                      label: tag.name
                    }))}
                    value={interestKey}
                    onChange={setInterestKey}
                  />
                  <FacetRow
                    label="场合"
                    options={OCCASION_OPTIONS}
                    value={occasionKey}
                    onChange={setOccasionKey}
                  />
                </div>

                <div className="results-bar">
                  <span>
                    <strong>{filteredGifts.length}</strong> 件符合
                  </span>
                  <span>共 {giftsData.total} 件 · 参考价</span>
                </div>

                {(keyword ||
                  recipientKey ||
                  priceKey !== 'all' ||
                  activeTypeTag ||
                  activeInterestTag ||
                  occasionKey) && (
                  <div className="selected-bar">
                    <span className="selected-label">已选</span>
                    {keyword && (
                      <button
                        type="button"
                        className="selected-chip"
                        onClick={() => setKeyword('')}
                        title="移除关键词"
                      >
                        关键词：{keyword}
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                    {recipientKey && (
                      <button
                        type="button"
                        className="selected-chip"
                        onClick={() => setRecipientKey(null)}
                        title="移除对象"
                      >
                        对象：{recipientKey}
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                    {priceKey !== 'all' && (
                      <button
                        type="button"
                        className="selected-chip"
                        onClick={() => setPriceKey('all')}
                        title="移除预算"
                      >
                        预算：{activePrice.label}
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                    {activeTypeTag && (
                      <button
                        type="button"
                        className="selected-chip"
                        onClick={() => setTypeKey(null)}
                        title="移除类型"
                      >
                        类型：{activeTypeTag.name}
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                    {activeInterestTag && (
                      <button
                        type="button"
                        className="selected-chip"
                        onClick={() => setInterestKey(null)}
                        title="移除兴趣"
                      >
                        兴趣：{activeInterestTag.name}
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                    {occasionKey && (
                      <button
                        type="button"
                        className="selected-chip"
                        onClick={() => setOccasionKey(null)}
                        title="移除场合"
                      >
                        场合：{occasionKey}
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="clear-link"
                      onClick={clearFilters}
                    >
                      清空筛选
                    </button>
                  </div>
                )}

                <p className="filter-note">
                  先选对象、预算和场合，再用类型、兴趣或关键词缩小范围。价格仅作品类参考，不是实时售价。
                </p>

                {filteredGifts.length > 0 ? (
                  <div className="gift-list">
                    {filteredGifts.map((gift) => (
                      <GiftCard
                        gift={gift}
                        key={gift.id}
                        favorite={favoriteByGiftId.get(gift.id)}
                        pending={favoritePending === gift.id}
                        onFavorite={handleFavorite}
                        onOpen={openGift}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="results-empty">
                    <span className="results-empty-emoji" aria-hidden="true">
                      🫙
                    </span>
                    <h3>
                      {keyword ? '没有找到相关礼物' : '没有同时符合的礼物'}
                    </h3>
                    <p>
                      {keyword
                        ? `没有找到“${keyword}”，换个词或减少筛选条件试试。`
                        : '试着减少一个条件，或者换一个预算/兴趣。'}
                    </p>
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={clearFilters}
                    >
                      清除筛选
                    </button>
                  </div>
                )}
              </div>
            </section>


          </>
        )}

        {status === 'ready' && view === 'warehouse' && (
          <>
            <section className="search-page warehouse-page">
              <div className="workbench-head">
                <div>
                  <h1>仓库</h1>
                  <p className="page-summary">
                    {activeFavorites.length} 件收藏 · 想送 {wishlistCount} · 已送{' '}
                    {giftedCount} · 已删除 {deletedFavorites.length}
                  </p>
                </div>
                <span className="page-meta">软删除可恢复</span>
              </div>

              <div className="search-hero">
                <div>
                  <p className="eyebrow">
                    <span className="eyebrow-dot" aria-hidden="true" />
                    GIFT WAREHOUSE · 非商业个人记录
                  </p>
                  <h1>
                    收好想送的，
                    <em>记住送过的</em>。
                  </h1>
                  <p className="search-lead">
                    从「找礼物」里收藏礼物；送出后标记为“已送”，并记下购买渠道和实际价格。
                    删除只做软删除，随时可以恢复。
                  </p>
                </div>

                <div className="search-summary" aria-label="仓库概览">
                  <div>
                    <strong>{wishlistCount}</strong>
                    <span>想送</span>
                  </div>
                  <div>
                    <strong>{giftedCount}</strong>
                    <span>已送</span>
                  </div>
                  <div>
                    <strong>{deletedFavorites.length}</strong>
                    <span>已删除</span>
                  </div>
                </div>
              </div>

              <div className="warehouse-toolbar">
                <div className="warehouse-tabs" role="tablist" aria-label="仓库筛选">
                  {WAREHOUSE_TABS.map((tab) => {
                    const count =
                      tab.key === 'all'
                        ? activeFavorites.length
                        : tab.key === 'trash'
                          ? deletedFavorites.length
                          : tab.key === 'wishlist'
                            ? wishlistCount
                            : giftedCount
                    return (
                      <button
                        type="button"
                        role="tab"
                        key={tab.key}
                        aria-selected={warehouseTab === tab.key}
                        className={`warehouse-tab ${warehouseTab === tab.key ? 'is-active' : ''}`}
                        onClick={() => setWarehouseTab(tab.key)}
                      >
                        {tab.label}
                        <span>{count}</span>
                      </button>
                    )
                  })}
                </div>
                <span className="warehouse-note">
                  点“保存”记录渠道与实际价格
                </span>
              </div>

              {warehouseItems.length > 0 ? (
                <div className="warehouse-list">
                  {warehouseItems.map((favorite) => (
                    <WarehouseItem
                      favorite={favorite}
                      key={favorite.id}
                      onUpdate={handleFavoriteUpdate}
                      onDelete={handleFavoriteDelete}
                      onRestore={handleFavoriteRestore}
                    />
                  ))}
                </div>
              ) : (
                <div className="results-empty warehouse-empty">
                  <span className="results-empty-emoji" aria-hidden="true">
                    🧺
                  </span>
                  <h3>
                    {warehouseTab === 'trash'
                      ? '删除区是空的'
                      : warehouseTab === 'gifted'
                        ? '还没有送出的礼物'
                        : warehouseTab === 'wishlist'
                          ? '还没有想送的礼物'
                          : '仓库还是空的'}
                  </h3>
                  <p>
                    {warehouseTab === 'trash'
                      ? '从仓库删除的礼物会先放在这里，随时可以恢复。'
                      : '去「找礼物」里挑一件礼物，点卡片右上角的“收藏”。'}
                  </p>
                  {warehouseTab !== 'trash' && (
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={() => showView('search')}
                    >
                      去找礼物收藏
                    </button>
                  )}
                </div>
              )}
            </section>


          </>
        )}

        {status === 'ready' && view === 'detail' && (
          <>
            {detailGift ? (
              <GiftDetail
                gift={detailGift}
                isAdmin={Boolean(user?.isAdmin)}
                onBack={() => showView('search')}
                onToast={showToast}
              />
            ) : (
              <div className="results-empty">
                <span className="results-empty-emoji" aria-hidden="true">
                  🎁
                </span>
                <h3>没有找到这件礼物</h3>
                <p>它可能已不在种子数据里，回到「找礼物」重新选择吧。</p>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => showView('search')}
                >
                  返回找礼物
                </button>
              </div>
            )}

          </>
        )}
      </main>

      <footer className="footer">
        <span>礼物助手 · 个人生日与礼物记录</span>
        <span className="footer-dot" aria-hidden="true" />
        <span>数据保存在本机 data/gift-assistant.db</span>
        <span className="footer-dot" aria-hidden="true" />
        <span>价格均为品类参考，非实时售价</span>
      </footer>

      {accountOpen && (
        <AccountModal
          user={user}
          onClose={() => setAccountOpen(false)}
          onLogout={handleLogout}
          onDeleted={clearClientSession}
          onToast={showToast}
        />
      )}

      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  )
}

function AccountModal({ user, onClose, onLogout, onDeleted, onToast }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleChangePassword(event) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: '两次输入的新密码不一致' })
      return
    }

    setChangingPassword(true)
    setPasswordMessage({ type: '', text: '' })
    try {
      await fetchJson('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage({ type: 'success', text: '密码已更新' })
      onToast?.('密码已更新，其他设备需要重新登录')
    } catch (error) {
      setPasswordMessage({
        type: 'error',
        text: error.message || '密码修改失败'
      })
    } finally {
      setChangingPassword(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm.trim() !== '删除') return

    setDeleting(true)
    setDeleteError('')
    try {
      await fetchJson('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword })
      })
      onDeleted()
      onToast?.('账号与账号数据已删除')
    } catch (error) {
      setDeleteError(error.message || '注销失败，请重试')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="account-modal"
        role="dialog"
        aria-modal="true"
        aria-label="账号设置"
      >
        <div className="account-modal-head">
          <div>
            <p className="section-kicker">ACCOUNT</p>
            <h2>账号设置</h2>
            <p className="account-modal-email">{user.email}</p>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="关闭账号设置"
          >
            ×
          </button>
        </div>

        <section className="account-section">
          <h3>修改密码</h3>
          <form className="account-form" onSubmit={handleChangePassword}>
            <label className="auth-field">
              <span>当前密码</span>
              <input
                type="password"
                value={currentPassword}
                required
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <div className="account-field-row">
              <label className="auth-field">
                <span>新密码</span>
                <input
                  type="password"
                  value={newPassword}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <label className="auth-field">
                <span>再次输入</span>
                <input
                  type="password"
                  value={confirmPassword}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            </div>
            {passwordMessage.text && (
              <p className={`form-message ${passwordMessage.type}`} role="status">
                {passwordMessage.text}
              </p>
            )}
            <button
              className="button button-primary account-submit"
              type="submit"
              disabled={changingPassword}
            >
              {changingPassword ? '更新中…' : '更新密码'}
            </button>
          </form>
        </section>

        <section className="account-section account-danger">
          <h3>注销账号</h3>
          <p>
            会永久删除你的好友、仓库、评价和上传图片，无法恢复。输入密码并在下方输入“删除”确认。
          </p>
          <div className="account-field-row">
            <label className="auth-field">
              <span>密码</span>
              <input
                type="password"
                value={deletePassword}
                autoComplete="current-password"
                onChange={(event) => setDeletePassword(event.target.value)}
              />
            </label>
            <label className="auth-field">
              <span>确认文字</span>
              <input
                type="text"
                value={deleteConfirm}
                placeholder="输入：删除"
                onChange={(event) => setDeleteConfirm(event.target.value)}
              />
            </label>
          </div>
          {deleteError && (
            <p className="form-message error" role="status">
              {deleteError}
            </p>
          )}
          <button
            className="button account-delete-button"
            type="button"
            disabled={
              deleting ||
              !deletePassword ||
              deleteConfirm.trim() !== '删除'
            }
            onClick={handleDeleteAccount}
          >
            {deleting ? '注销中…' : '永久注销账号'}
          </button>
        </section>

        <div className="account-modal-foot">
          <button className="button button-ghost" type="button" onClick={onLogout}>
            退出登录
          </button>
        </div>
      </section>
    </div>
  )
}

function AuthLoading() {
  return (
    <div className="auth-shell">
      <div className="auth-loading">
        <img
          className="brand-mark auth-loading-mark"
          src="/brand-icon-96.png"
          alt=""
          aria-hidden="true"
        />
        <div className="spinner" aria-hidden="true" />
        <p>正在确认登录状态…</p>
      </div>
    </div>
  )
}

function AuthScreen({ onAuthed, initialError }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteRequired, setInviteRequired] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchJson('/api/auth/config')
      .then((payload) => setInviteRequired(Boolean(payload.inviteRequired)))
      .catch(() => {
        // 配置读取失败时按开放注册处理，提交阶段仍会校验
      })
  }, [])

  function switchMode(nextMode) {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setSubmitting(true)
    try {
      const payload = await fetchJson(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, inviteCode })
      })
      onAuthed(payload.user)
    } catch (authSubmitError) {
      setError(authSubmitError.message || '操作失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <div className="auth-wrap">
        <section className="auth-intro">
          <a className="brand" href="/">
            <img
              className="brand-mark"
              src="/brand-icon-96.png"
              alt=""
              aria-hidden="true"
            />
            <span className="brand-text">
              <strong>礼物助手</strong>
              <small>Gift Assistant</small>
            </span>
          </a>

          <p className="eyebrow auth-eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            个人账号 · 本地优先
          </p>
          <h1>
            把生日和礼物，
            <br />
            <em>留在自己的账号里</em>。
          </h1>
          <p className="auth-lead">
            每个人用自己的邮箱登录，好友生日和礼物仓库互相隔离；评价全站共享并匿名展示。
            数据保存在部署的服务器上。
          </p>

          <ul className="auth-features">
            <li>生日倒计时与性别称呼</li>
            <li>标签交集筛选与价格区间</li>
            <li>想送 / 已送仓库与恢复</li>
            <li>贝叶斯评分与图文评价</li>
          </ul>

          <p className="auth-privacy">
            登录仅需要邮箱和密码，不发送验证邮件，也不接入第三方登录。
          </p>
        </section>

        <section className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="登录或注册">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => switchMode('login')}
            >
              登录
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'is-active' : ''}
              onClick={() => switchMode('register')}
            >
              注册
            </button>
          </div>

          <h2>{mode === 'login' ? '欢迎回来' : '创建账号'}</h2>
          <p className="auth-card-hint">
            {mode === 'login'
              ? '用邮箱和密码进入你的生日与礼物记录。'
              : '邮箱只作为登录名使用，不会发送邮件。'}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>邮箱</span>
              <input
                type="email"
                value={email}
                required
                autoComplete="username"
                placeholder="you@example.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>密码</span>
              <input
                type="password"
                value={password}
                required
                minLength={8}
                maxLength={128}
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                placeholder="至少 8 个字符"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {mode === 'register' && (
              <label className="auth-field">
                <span>确认密码</span>
                <input
                  type="password"
                  value={confirmPassword}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="再输入一次密码"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            )}

            {mode === 'register' && inviteRequired && (
              <label className="auth-field">
                <span>邀请码</span>
                <input
                  type="text"
                  value={inviteCode}
                  required
                  autoComplete="off"
                  placeholder="向管理员获取邀请码"
                  onChange={(event) => setInviteCode(event.target.value)}
                />
              </label>
            )}

            {(error || initialError) && (
              <p className="form-message error auth-error" role="alert">
                {error || initialError}
              </p>
            )}

            <button
              className="button button-primary auth-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? mode === 'login'
                  ? '登录中…'
                  : '创建中…'
                : mode === 'login'
                  ? '登录'
                  : '注册并登录'}
            </button>
          </form>

          <p className="auth-card-note">
            {mode === 'register'
              ? inviteRequired
                ? '当前部署开启了邀请码注册，请向管理员获取邀请码。'
                : '如果是本机第一个账号，已有的好友、仓库和评价会自动归入这个账号。'
              : '还没有账号？切换到“注册”，用邮箱创建一个。'}
          </p>
        </section>
      </div>
    </div>
  )
}

function NearestBirthdayCard({ friend, loading }) {
  return (
    <div
      className={`nearest-card ${friend?.isToday ? 'is-today' : ''}`}
      aria-live="polite"
    >
      <div className="nearest-head">
        <span className="nearest-label">最近生日</span>
        <span className="nearest-tag">自动排序</span>
      </div>

      {loading ? (
        <div className="nearest-loading">
          <div className="spinner" aria-hidden="true" />
          <p>正在读取好友生日…</p>
        </div>
      ) : friend ? (
        <>
          <div className="nearest-person">
            <span className="nearest-avatar" aria-hidden="true">
              {friend.name.slice(0, 1)}
            </span>
            <div>
              <h3>{friend.name}</h3>
              <p>
                {friend.birthdayLabel}
                {friend.birthYear ? ` · ${friend.birthYear} 年生` : ''}
              </p>
            </div>
          </div>

          <div className="nearest-count">
            <strong>{friend.isToday ? '今天' : friend.daysUntil}</strong>
            {!friend.isToday && <span>天后</span>}
          </div>

          <p className="nearest-caption">
            {friend.isToday
              ? `${friend.name} 今天生日，快去祝${pronounOf(friend)}生日快乐吧。`
              : `下一次是 ${friend.nextBirthdayLabel}，可以开始想礼物了。`}
          </p>

          {friend.turnsAge != null && (
            <span className="nearest-age">即将 {friend.turnsAge} 岁</span>
          )}
        </>
      ) : (
        <div className="nearest-empty">
          <span className="nearest-empty-emoji" aria-hidden="true">
            🎂
          </span>
          <h3>还没有记录生日</h3>
          <p>在下方添加第一位朋友，列表会自动排好顺序。</p>
        </div>
      )}

      <span className="nearest-orbit" aria-hidden="true" />
    </div>
  )
}

function FriendRow({ friend, selected, onSelect, onGenderChange }) {
  const isToday = friend.isToday

  return (
    <li
      className={`birthday-row ${isToday ? 'is-today' : ''} ${selected ? 'is-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(selected ? null : friend.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(selected ? null : friend.id)
        }
      }}
    >
      <span className="birthday-block" aria-hidden="true">
        {isToday ? '🎂' : '🎁'}
      </span>

      <div className="birthday-row-main">
        <div className="birthday-name-line">
          <strong>{friend.name}</strong>
          {friend.turnsAge != null && (
            <span className="birthday-age">将满 {friend.turnsAge} 岁</span>
          )}
          <select
            className="birthday-gender"
            value={friend.gender ?? ''}
            aria-label={`${friend.name}的性别`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onChange={(event) => onGenderChange(friend.id, event.target.value)}
          >
            <option value="">性别</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </div>
        <div className="birthday-row-meta">
          {isToday ? (
            <>今天生日，快去祝{pronounOf(friend)}生日快乐吧</>
          ) : (
            <>
              {friend.birthYear ? `${friend.birthYear} 年生 · ` : ''}
              下次 {friend.nextBirthdayLabel}
            </>
          )}
        </div>
      </div>

      <span className="birthday-date">{friend.birthdayLabel}</span>

      <div className="birthday-countdown">
        <strong>{isToday ? '今天生日' : `${friend.daysUntil} 天后`}</strong>
        <span>{isToday ? '别忘了祝福' : '距离下次生日'}</span>
      </div>
    </li>
  )
}

function FacetRow({ label, options, value, onChange }) {
  return (
    <div className="facet-row">
      <span className="facet-label">{label}</span>
      <div className="facet-chips">
        <button
          type="button"
          className={`facet-chip ${value == null ? 'is-active' : ''}`}
          aria-pressed={value == null}
          onClick={() => onChange(null)}
        >
          全部
        </button>
        {options.map((option) => {
          const optionValue = option?.value ?? option
          const optionLabel = option?.label ?? option
          const active = value === optionValue
          return (
            <button
              type="button"
              key={optionValue}
              className={`facet-chip ${active ? 'is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onChange(active ? null : optionValue)}
            >
              {optionLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

function formatReviewDate(value) {
  if (!value) return ''
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function GiftDetail({ gift, isAdmin, onBack, onToast }) {
  const [reviewData, setReviewData] = useState(null)
  const [reviewStatus, setReviewStatus] = useState('loading')
  const [reviewError, setReviewError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [image, setImage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    const controller = new AbortController()
    setReviewStatus('loading')
    setReviewError('')

    fetchJson(`/api/gifts/${gift.id}/reviews`, { signal: controller.signal })
      .then((payload) => {
        setReviewData(payload)
        setReviewStatus('ready')
      })
      .catch((fetchError) => {
        if (fetchError.name === 'AbortError') return
        setReviewError(fetchError.message || '评价加载失败')
        setReviewStatus('error')
      })

    return () => controller.abort()
  }, [gift.id, reloadKey])

  const tags = gift.tags.filter((tag) => tag.parentId != null).slice(0, 5)
  const score = reviewData ? reviewData.score.toFixed(1) : '—'
  const ratingCount = reviewData?.ratingCount ?? 0

  async function handleImageChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setFormMessage({
        type: 'error',
        text: '只支持 PNG、JPEG、WebP 或 GIF 图片'
      })
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setFormMessage({ type: 'error', text: '图片不能超过 4MB' })
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setImage({ dataUrl, mimeType: file.type, fileName: file.name })
      setFormMessage({ type: '', text: '' })
    } catch {
      setFormMessage({ type: 'error', text: '读取图片失败，请重试' })
    }
  }

  async function handleDeleteReview(reviewId) {
    if (!window.confirm('删除这条评价？删除后无法恢复。')) return
    try {
      await fetchJson(`/api/reviews/${reviewId}`, { method: 'DELETE' })
      onToast?.('评价已删除')
      setReloadKey((key) => key + 1)
    } catch (deleteError) {
      onToast?.(deleteError.message || '删除评价失败')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (rating === 0) {
      setFormMessage({ type: 'error', text: '请先选择 1-5 星评分' })
      return
    }

    setSubmitting(true)
    setFormMessage({ type: '', text: '' })
    try {
      await fetchJson(`/api/gifts/${gift.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment,
          image: image
            ? {
                data: image.dataUrl.split(',')[1],
                mimeType: image.mimeType,
                fileName: image.fileName
              }
            : null
        })
      })
      setRating(0)
      setComment('')
      setImage(null)
      setFormMessage({ type: 'success', text: '评价已提交' })
      onToast?.('评价已提交，展示分已更新')
      setReloadKey((key) => key + 1)
    } catch (submitError) {
      setFormMessage({
        type: 'error',
        text: submitError.message || '提交失败，请重试'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="detail-page">
      <button className="back-button" type="button" onClick={onBack}>
        <span aria-hidden="true">←</span> 返回找礼物
      </button>

      <div className="detail-hero">
        <div
          className="detail-visual"
          style={{ '--from': gift.gradientFrom, '--to': gift.gradientTo }}
        >
          <span className="detail-category">{gift.category}</span>
          <span className="detail-emoji" role="img" aria-label={gift.name}>
            {gift.emoji}
          </span>
          <span className="detail-visual-glow" aria-hidden="true" />
        </div>

        <div className="detail-copy">
          <p className="section-kicker">GIFT DETAIL · 品类参考</p>
          <h1>{gift.name}</h1>
          <p className="detail-fit">
            <span>适合</span>
            {gift.fitFor}
          </p>
          <p className="detail-reason">{gift.reason}</p>

          <div className="gift-tags">
            {tags.map((tag) => (
              <span
                className={`tag-chip ${tag.parentName === '风格' ? 'tag-chip-style' : ''}`}
                key={tag.id}
              >
                {tag.name}
              </span>
            ))}
          </div>

          <div className="detail-meta-row">
            <div className="detail-price">
              <strong>{gift.priceLabel}</strong>
              <span>{gift.priceNote}</span>
            </div>

            <div className="detail-score">
              <strong>{score}</strong>
              <div>
                <span>全站贝叶斯评分 / 10</span>
                <small>{ratingCount} 条评价</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="review-layout">
        <div className="review-list-card">
          <div className="review-list-head">
            <div>
              <p className="section-kicker">REVIEWS</p>
              <h2>全站评价</h2>
            </div>
            <span className="review-count">{ratingCount} 条</span>
          </div>

          {reviewStatus === 'loading' && (
            <div className="review-loading">
              <div className="spinner" aria-hidden="true" />
              <span>正在读取评价…</span>
            </div>
          )}

          {reviewStatus === 'error' && (
            <div className="review-error">
              <p>{reviewError}</p>
              <button
                className="button button-ghost"
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                重试
              </button>
            </div>
          )}

          {reviewStatus === 'ready' && reviewData.reviews.length === 0 && (
            <div className="review-empty">
              <span aria-hidden="true">✍️</span>
              <h3>还没有评价</h3>
              <p>送出之后，把真实感受记下来，给下一次选择一点参考。</p>
            </div>
          )}

          {reviewStatus === 'ready' && reviewData.reviews.length > 0 && (
            <div className="review-items">
              {reviewData.reviews.map((review) => (
                <article className="review-item" key={review.id}>
                  <div className="review-item-head">
                    <div className="review-item-meta">
                      <span className="review-author">匿名用户</span>
                      <span
                        className="review-stars"
                        aria-label={`${review.rating} 星`}
                      >
                        {'★'.repeat(review.rating)}
                        {'☆'.repeat(5 - review.rating)}
                      </span>
                    </div>
                    <div className="review-item-side">
                      <span className="review-date">
                        {formatReviewDate(review.createdAt)}
                      </span>
                      {isAdmin && (
                        <button
                          className="review-delete"
                          type="button"
                          onClick={() => handleDeleteReview(review.id)}
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="review-comment">{review.comment}</p>
                  )}
                  {review.imagePath && (
                    <a
                      className="review-image-link"
                      href={review.imagePath}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        className="review-image"
                        src={review.imagePath}
                        alt="评价图片"
                        loading="lazy"
                      />
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="review-form-card">
          <h3>写一条评价</h3>
          <p className="review-form-hint">
            评分由后端做贝叶斯平均，单条 5 星不会直接显示 10 分。
            评价会匿名展示给所有登录用户，并计入全站评分；管理员会删除违规内容。
          </p>

          <form className="review-form" onSubmit={handleSubmit}>
            <div
              className="star-input"
              onMouseLeave={() => setHoverRating(0)}
              aria-label="选择评分"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  type="button"
                  key={value}
                  className={
                    value <= (hoverRating || rating) ? 'star-button is-on' : 'star-button'
                  }
                  aria-label={`${value} 星`}
                  aria-pressed={rating === value}
                  onMouseEnter={() => setHoverRating(value)}
                  onClick={() => {
                    setRating(value)
                    setFormMessage({ type: '', text: '' })
                  }}
                >
                  ★
                </button>
              ))}
              <span>{rating ? `${rating} 星` : '选择评分'}</span>
            </div>

            <label className="review-textarea-label">
              <span>评价文字</span>
              <textarea
                className="review-textarea"
                rows={4}
                maxLength={1000}
                value={comment}
                placeholder="送出去之后，对方喜欢吗？"
                onChange={(event) => setComment(event.target.value)}
              />
              <small>{comment.length} / 1000</small>
            </label>

            <div className="review-image-field">
              <label className="review-file-button">
                添加图片
                <input
                  className="review-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageChange}
                />
              </label>
              <span className="review-file-note">PNG / JPEG / WebP / GIF，最大 4MB</span>
            </div>

            {image && (
              <div className="review-preview">
                <img src={image.dataUrl} alt="待上传的图片预览" />
                <div>
                  <span>{image.fileName}</span>
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className="review-preview-remove"
                  >
                    移除图片
                  </button>
                </div>
              </div>
            )}

            {formMessage.text && (
              <p className={`form-message ${formMessage.type}`} role="status">
                {formMessage.text}
              </p>
            )}

            <button
              className="button button-primary review-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? '提交中…' : '提交评价'}
            </button>
          </form>
        </aside>
      </div>
    </section>
  )
}

function WarehouseItem({ favorite, onUpdate, onDelete, onRestore }) {
  const gift = favorite.gift
  const deleted = Boolean(favorite.deletedAt)
  const [channel, setChannel] = useState(favorite.channel ?? '')
  const [price, setPrice] = useState(
    favorite.actualPrice != null ? String(favorite.actualPrice) : ''
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setChannel(favorite.channel ?? '')
    setPrice(favorite.actualPrice != null ? String(favorite.actualPrice) : '')
  }, [favorite.id, favorite.channel, favorite.actualPrice])

  if (!gift) return null

  async function saveFields() {
    setSaving(true)
    try {
      await onUpdate(favorite.id, {
        channel: channel.trim() || null,
        actualPrice: price === '' ? null : Number(price)
      })
    } catch {
      // 错误提示由上层统一处理
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(status) {
    if (favorite.status === status) return
    try {
      await onUpdate(favorite.id, { status })
    } catch {
      // 错误提示由上层统一处理
    }
  }

  async function removeItem() {
    try {
      await onDelete(favorite.id)
    } catch {
      // 错误提示由上层统一处理
    }
  }

  async function restoreItem() {
    try {
      await onRestore(favorite.id)
    } catch {
      // 错误提示由上层统一处理
    }
  }

  return (
    <article className={`warehouse-item ${deleted ? 'is-deleted' : ''}`}>
      <div className="warehouse-head">
        <div className="warehouse-gift">
          <span
            className="warehouse-emoji"
            style={{
              '--from': gift.gradientFrom,
              '--to': gift.gradientTo
            }}
            aria-hidden="true"
          >
            {gift.emoji}
          </span>
          <div className="warehouse-info">
            <div className="warehouse-title">
              <h3>{gift.name}</h3>
              <span className={`status-badge ${favorite.status}`}>
                {favorite.status === 'wishlist' ? '想送' : '已送'}
              </span>
              {deleted && <span className="status-badge deleted">已删除</span>}
            </div>
            <p className="warehouse-meta">
              {gift.category} · 参考价 {gift.priceLabel} · {gift.fitFor}
            </p>
          </div>
        </div>

        {!deleted && (
          <div className="status-switch" aria-label="赠送状态">
            <button
              type="button"
              className={favorite.status === 'wishlist' ? 'is-active' : ''}
              onClick={() => changeStatus('wishlist')}
            >
              想送
            </button>
            <button
              type="button"
              className={favorite.status === 'gifted' ? 'is-active' : ''}
              onClick={() => changeStatus('gifted')}
            >
              已送
            </button>
          </div>
        )}
      </div>

      {deleted ? (
        <div className="warehouse-deleted-meta">
          <span>渠道：{favorite.channel || '未填写'}</span>
          <span>
            实际价格：
            {favorite.actualPrice != null ? `¥${favorite.actualPrice}` : '未填写'}
          </span>
        </div>
      ) : (
        <div className="warehouse-edit">
          <label className="warehouse-field">
            <span>购买渠道</span>
            <input
              type="text"
              value={channel}
              maxLength={80}
              placeholder="例如：运动用品店 / 品牌官网"
              onChange={(event) => setChannel(event.target.value)}
            />
          </label>
          <label className="warehouse-field">
            <span>实际价格</span>
            <input
              type="number"
              value={price}
              min={0}
              step="0.01"
              placeholder="可选"
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          <button
            className="button warehouse-save"
            type="button"
            disabled={saving}
            onClick={saveFields}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      )}

      <div className="warehouse-foot">
        {deleted ? (
          <button
            className="warehouse-action restore"
            type="button"
            onClick={restoreItem}
          >
            恢复这件礼物
          </button>
        ) : (
          <button
            className="warehouse-action delete"
            type="button"
            onClick={removeItem}
          >
            移入已删除
          </button>
        )}
      </div>
    </article>
  )
}

function StatCard({ value, label, hint }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-hint">{hint}</span>
    </div>
  )
}

function GiftCard({ gift, favorite, pending, onFavorite, onOpen }) {
  const visibleTags = gift.tags.filter((tag) => tag.parentId != null).slice(0, 4)
  const tags = visibleTags.length ? visibleTags : gift.tags.slice(0, 3)

  return (
    <article className="gift-row">
      <div className="gift-row-block" aria-hidden="true">
        {gift.emoji}
      </div>

      <div className="gift-row-main">
        <div className="gift-row-head">
          <h3>{gift.name}</h3>
          <span className="gift-row-category">{gift.category}</span>
        </div>
        <p className="gift-row-fit">
          <span>适合</span>
          {gift.fitFor}
        </p>
        <p className="gift-row-reason">{gift.reason}</p>

        <div className="gift-row-tags">
          {tags.map((tag) => (
            <span
              className={`tag-chip ${tag.parentName === '风格' ? 'tag-chip-style' : ''}`}
              key={tag.id}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      <div className="gift-row-price">
        <strong>{gift.priceLabel}</strong>
        <span>{gift.priceNote}</span>
      </div>

      <div className="gift-row-actions">
        <button
          type="button"
          className={`gift-favorite-button ${favorite ? 'is-saved' : ''}`}
          disabled={Boolean(favorite) || Boolean(pending)}
          aria-label={favorite ? `${gift.name} 已在仓库` : `收藏 ${gift.name}`}
          onClick={(event) => {
            event.stopPropagation()
            onFavorite?.(gift)
          }}
        >
          {favorite ? '已收藏' : pending ? '收藏中…' : '收藏'}
        </button>
        <button
          type="button"
          className="gift-open-button"
          onClick={() => onOpen?.(gift.id)}
        >
          详情
        </button>
      </div>
    </article>
  )
}

function LoadingPanel() {
  return (
    <section className="panel loading-panel" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <div>
        <p className="panel-kicker">正在连接</p>
        <h2>读取好友、礼物与仓库数据</h2>
        <p className="panel-text">数据都来自本机 SQLite，通常只需要一瞬间。</p>
      </div>
    </section>
  )
}

function StagePanel() {
  return (
    <section className="stage-panel">
      <div className="stage-panel-intro">
        <p className="section-kicker">STAGE 6 · RELEASE</p>
        <h2>项目已完成</h2>
        <p className="section-lead">
          README、功能截图与发布准备已经补齐。后续功能留在 Roadmap 里，不再扩展现有范围。
        </p>
        <span className="waiting-pill">
          <span className="waiting-dot" aria-hidden="true" />
          等待最终验收
        </span>
      </div>

      <div className="stage-columns">
        <div className="stage-column">
          <h3>已完成</h3>
          <ul className="check-list">
            <li>README 包含简介、技术栈、运行方式、截图与合规说明</li>
            <li>四张实际运行截图：生日、标签搜索、仓库、商品评价</li>
            <li>.gitignore 已排除 node_modules、数据库与上传图片</li>
            <li>Git 仓库初始化与首次提交准备就绪</li>
          </ul>
        </div>

        <div className="stage-column stage-column-next">
          <h3>Roadmap</h3>
          <ul className="next-list">
            <li>视频评论与表情包</li>
            <li>多用户登录与云端同步</li>
            <li>生日提醒与礼物计划导出</li>
          </ul>
          <p className="next-note">这些都不在当前版本范围内，留作后续迭代。</p>
        </div>
      </div>
    </section>
  )
}

export default App
