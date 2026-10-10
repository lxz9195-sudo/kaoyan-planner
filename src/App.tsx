import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Cpu,
  Languages,
  Landmark,
  Pause,
  Plus,
  Play,
  RotateCcw,
  Target,
  Timer,
  Trash2,
} from 'lucide-react'
import './App.css'

type Subject = '数学二' | '英语二' | '政治' | '电路原理'

type StudyTask = {
  id: string
  title: string
  subject: Subject
  minutes: number
  date: string
  completed: boolean
}

const storageKey = 'kaoyan-study-tasks-v1'
const subjects: Subject[] = ['数学二', '英语二', '政治', '电路原理']
const currentDate = new Date()
const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
const examDate = new Date(2026, 11, 19)
const daysUntilExam = Math.max(0, Math.ceil((examDate.getTime() - currentDay.getTime()) / 86400000))
const weekStartOffset = (currentDay.getDay() + 6) % 7
const weekDays = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(currentDay)
  date.setDate(currentDay.getDate() - weekStartOffset + index)
  const key = todayKey(date)
  return { key, label: ['一', '二', '三', '四', '五', '六', '日'][index], isToday: key === todayKey(currentDay) }
})
const subjectIcons = {
  数学二: Target,
  英语二: Languages,
  政治: Landmark,
  电路原理: Cpu,
}

const initialTasks: StudyTask[] = [
  { id: 'math-1', title: '线性代数 · 特征值与特征向量', subject: '数学二', minutes: 90, date: todayKey(currentDate), completed: true },
  { id: 'english-1', title: '核心词汇 · 第 18 组', subject: '英语二', minutes: 35, date: todayKey(currentDate), completed: true },
  { id: 'circuit-1', title: '电路分析 · 戴维南定理', subject: '电路原理', minutes: 60, date: todayKey(currentDate), completed: false },
  { id: 'politics-1', title: '马原 · 唯物辩证法', subject: '政治', minutes: 45, date: todayKey(currentDate), completed: false },
  { id: 'math-2', title: '高等数学 · 二重积分习题', subject: '数学二', minutes: 60, date: todayKey(currentDate), completed: false },
]

function todayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function loadTasks(): StudyTask[] {
  try {
    const savedTasks = localStorage.getItem(storageKey)
    return savedTasks ? JSON.parse(savedTasks) as StudyTask[] : initialTasks
  } catch {
    return initialTasks
  }
}

function App() {
  const [tasks, setTasks] = useState<StudyTask[]>(loadTasks)
  const [filter, setFilter] = useState<Subject | '全部'>('全部')
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSubject, setNewSubject] = useState<Subject>('数学二')
  const [newMinutes, setNewMinutes] = useState(60)
  const [timerPhase, setTimerPhase] = useState<'focus' | 'break'>('focus')
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60)
  const [timerDeadline, setTimerDeadline] = useState<number | null>(null)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const todayTasks = useMemo(() => tasks.filter((task) => task.date === todayKey(currentDate)), [tasks])
  const weeklyStats = useMemo(() => weekDays.map((day) => ({
    ...day,
    minutes: tasks.filter((task) => task.date === day.key && task.completed)
      .reduce((total, task) => total + task.minutes, 0),
  })), [tasks])
  const weeklyMinutes = weeklyStats.reduce((total, day) => total + day.minutes, 0)
  const maxDailyMinutes = Math.max(0, ...weeklyStats.map((day) => day.minutes))
  const visibleTasks = todayTasks.filter((task) => filter === '全部' || task.subject === filter)
  const completedTasks = todayTasks.filter((task) => task.completed).length
  const completion = todayTasks.length ? Math.round((completedTasks / todayTasks.length) * 100) : 0
  const studyMinutes = todayTasks.filter((task) => task.completed).reduce((total, task) => total + task.minutes, 0)
  const dateLabel = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  }).format(currentDate)
  const timerDisplay = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`
  const timerPhaseLabel = timerPhase === 'focus' ? '专注时间' : '短休息'

  useEffect(() => {
    if (!isTimerRunning || timerDeadline === null) return

    const tick = () => {
      const secondsLeft = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000))
      setRemainingSeconds(secondsLeft)
      if (secondsLeft === 0) {
        const nextPhase = timerPhase === 'focus' ? 'break' : 'focus'
        window.clearInterval(intervalId)
        setIsTimerRunning(false)
        setTimerDeadline(null)
        setTimerPhase(nextPhase)
        setRemainingSeconds(nextPhase === 'focus' ? 25 * 60 : 5 * 60)
      }
    }

    const intervalId = window.setInterval(tick, 250)
    tick()
    return () => window.clearInterval(intervalId)
  }, [isTimerRunning, timerDeadline, timerPhase])

  function saveTasks(nextTasks: StudyTask[]) {
    setTasks(nextTasks)
    localStorage.setItem(storageKey, JSON.stringify(nextTasks))
  }

  function toggleTask(id: string) {
    saveTasks(tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task))
  }

  function deleteTask(id: string) {
    saveTasks(tasks.filter((task) => task.id !== id))
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    saveTasks([
      { id: crypto.randomUUID(), title, subject: newSubject, minutes: newMinutes, date: todayKey(currentDate), completed: false },
      ...tasks,
    ])
    setNewTitle('')
    setIsAdding(false)
    setFilter('全部')
  }

  function toggleTimer() {
    if (isTimerRunning) {
      const secondsLeft = timerDeadline === null
        ? remainingSeconds
        : Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000))
      setRemainingSeconds(secondsLeft)
      setTimerDeadline(null)
      setIsTimerRunning(false)
      return
    }
    setTimerDeadline(Date.now() + remainingSeconds * 1000)
    setIsTimerRunning(true)
  }

  function resetTimer() {
    setIsTimerRunning(false)
    setTimerDeadline(null)
    setRemainingSeconds(timerPhase === 'focus' ? 25 * 60 : 5 * 60)
  }

  function selectTimerPhase(phase: 'focus' | 'break') {
    setIsTimerRunning(false)
    setTimerDeadline(null)
    setTimerPhase(phase)
    setRemainingSeconds(phase === 'focus' ? 25 * 60 : 5 * 60)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="研途首页">
          <span className="brand-mark"><BookOpen size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">研途<span>.</span></span>
        </a>

        <div className="sidebar-label">工作台</div>
        <div className="nav-item active"><span className="nav-indicator" />今日总览</div>

        <div className="sidebar-subjects">
          <div className="sidebar-label">我的科目</div>
          {subjects.map((subject) => {
            const Icon = subjectIcons[subject]
            const count = todayTasks.filter((task) => task.subject === subject).length
            return (
              <button
                className={`subject-nav ${filter === subject ? 'selected' : ''}`}
                key={subject}
                onClick={() => setFilter(filter === subject ? '全部' : subject)}
                type="button"
              >
                <Icon size={17} />
                <span>{subject}</span>
                <span className="subject-count">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="sidebar-note">
          <span className="note-icon"><Target size={16} /></span>
          <p>今天也向目标<br />靠近了一点。</p>
          <span className="note-caption">一步一步，稳稳上岸</span>
          <div className="note-line" />
        </div>

        <div className="sidebar-profile">
          <div className="avatar">研</div>
          <div><strong>备考中的你</strong><span>2027 考研</span></div>
          <span className="online-dot" />
        </div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar">
          <div className="breadcrumb"><span>工作台</span><span className="breadcrumb-separator">/</span><strong>今日总览</strong></div>
          <div className="topbar-date"><span className="date-dot" />{dateLabel}</div>
        </header>

        <div className="dashboard">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span />YOUR STUDY SPACE</div>
              <h1>今天，继续向前。</h1>
              <p>把专注留给当下，剩下的交给时间。</p>
            </div>
            <div className="streak-chip"><span className="streak-spark">✳</span><span><strong>保持节奏</strong><small>每天进步一点点</small></span></div>
          </section>

          <section className="overview-grid" aria-label="备考概况">
            <article className="countdown-card">
              <div className="countdown-top"><span className="card-kicker">距离初试</span><span className="exam-tag">2027 考研</span></div>
              <div className="countdown-number">{daysUntilExam}<span>天</span></div>
              <p className="countdown-copy">每一份努力，都在抵达的路上。</p>
              <div className="countdown-bottom"><span>预计初试日期</span><strong>2026.12.19</strong></div>
              <div className="countdown-decoration"><span /><span /><span /><span /><span /><span /><span /></div>
            </article>

            <article className="completion-card">
              <div className="card-heading"><div><span className="card-kicker">今日完成率</span><h2>学习进度</h2></div><span className="progress-icon"><Check size={17} /></span></div>
              <div className="completion-stat"><strong>{completion}<small>%</small></strong><span className="completion-fraction">{completedTasks}<i> / </i>{todayTasks.length} 项完成</span></div>
              <div className="progress-track"><span style={{ width: `${completion}%` }} /></div>
              <div className="completion-bottom"><span><Clock3 size={14} />已完成约 {Math.floor(studyMinutes / 60)} 小时 {studyMinutes % 60} 分钟</span><span className="trend"><ArrowUpRight size={14} />保持专注</span></div>
            </article>

            <article className="focus-card">
              <div className="focus-ring"><span><Target size={19} /></span></div>
              <div className="focus-copy"><span className="card-kicker">今日计划</span><strong>{todayTasks.length}<small> 项任务</small></strong><span>已完成 {completedTasks} 项</span></div>
              <ArrowDownRight className="focus-arrow" size={18} />
            </article>

            <article className="weekly-card">
              <div className="weekly-heading"><div><span className="card-kicker">WEEKLY FOCUS</span><h2>本周学习时长</h2></div><CalendarDays size={17} /></div>
              <div className="weekly-total"><strong>{Math.floor(weeklyMinutes / 60)}<small>小时</small></strong><strong>{String(weeklyMinutes % 60).padStart(2, '0')}<small>分</small></strong></div>
              <div className="week-chart" role="img" aria-label={`本周每天完成任务的预计用时：${weeklyStats.map((day) => `周${day.label} ${day.minutes} 分钟`).join('，')}`}>
                {weeklyStats.map((day) => {
                  const barHeight = day.minutes ? Math.max(12, (day.minutes / maxDailyMinutes) * 100) : 4
                  return (
                    <div className={`week-day ${day.isToday ? 'week-day-today' : ''}`} key={day.key} title={`周${day.label}：${day.minutes} 分钟`}>
                      <span className="week-bar" style={{ height: `${barHeight}%` }} />
                      <span className="week-day-label">{day.label}</span>
                    </div>
                  )
                })}
              </div>
              <span className="weekly-caption">按已完成任务的预计用时统计</span>
            </article>
          </section>

          <section className="pomodoro-panel" aria-label="番茄钟">
            <div className="pomodoro-intro">
              <span className="pomodoro-icon"><Timer size={18} /></span>
              <div><span className="section-kicker">FOCUS SESSION</span><h2>番茄钟</h2><p>{timerPhaseLabel} · 时间到后自动切换</p></div>
            </div>
            <div className="pomodoro-center">
              <div className="pomodoro-modes" role="group" aria-label="计时模式">
                <button className={timerPhase === 'focus' ? 'mode-active' : ''} onClick={() => selectTimerPhase('focus')} type="button" aria-pressed={timerPhase === 'focus'}>专注 25 分钟</button>
                <button className={timerPhase === 'break' ? 'mode-active' : ''} onClick={() => selectTimerPhase('break')} type="button" aria-pressed={timerPhase === 'break'}>短休息 5 分钟</button>
              </div>
              <div className="timer-clock" role="timer" aria-label={`${timerPhaseLabel}，${timerDisplay}`} aria-live="off">{timerDisplay}</div>
            </div>
            <div className="timer-actions">
              <button className="timer-toggle" onClick={toggleTimer} type="button">{isTimerRunning ? <Pause size={16} /> : <Play size={16} />}{isTimerRunning ? '暂停' : '开始'}</button>
              <button className="timer-reset" onClick={resetTimer} type="button" aria-label="重置计时器" title="重置"><RotateCcw size={17} /></button>
            </div>
          </section>

          <section className="tasks-section">
            <div className="tasks-header">
              <div><div className="section-kicker">STAY ON TRACK</div><h2>今日学习任务 <span>{todayTasks.length}</span></h2></div>
              <button className="add-button" type="button" onClick={() => setIsAdding(!isAdding)}>
                {isAdding ? <Check size={16} /> : <Plus size={17} />}{isAdding ? '收起' : '添加任务'}
              </button>
            </div>

            {isAdding && (
              <form className="add-task-form" onSubmit={addTask}>
                <label className="task-title-input"><span>任务内容</span><input autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="例如：完成阅读理解两篇" required /></label>
                <label><span>科目</span><select value={newSubject} onChange={(event) => setNewSubject(event.target.value as Subject)}>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
                <label><span>预计时长</span><select value={newMinutes} onChange={(event) => setNewMinutes(Number(event.target.value))}><option value={25}>25 分钟</option><option value={45}>45 分钟</option><option value={60}>60 分钟</option><option value={90}>90 分钟</option><option value={120}>120 分钟</option></select></label>
                <button className="submit-task" type="submit">保存任务</button>
              </form>
            )}

            <div className="task-toolbar">
              <div className="filter-tabs" role="group" aria-label="按科目筛选">
                {(['全部', ...subjects] as const).map((subject) => (
                  <button className={filter === subject ? 'filter-active' : ''} key={subject} onClick={() => setFilter(subject)} type="button">{subject}</button>
                ))}
              </div>
              <span className="task-summary">{completedTasks} / {todayTasks.length} 已完成</span>
            </div>

            <div className="task-list">
              {visibleTasks.length === 0 ? (
                <div className="empty-state"><span><BookOpen size={20} /></span><strong>{todayTasks.length ? '这个科目暂时没有任务' : '今天还没有安排任务'}</strong><p>给今天定一个小目标，开始行动吧。</p></div>
              ) : visibleTasks.map((task) => {
                const Icon = subjectIcons[task.subject]
                return (
                  <article className={`task-row ${task.completed ? 'task-completed' : ''}`} key={task.id}>
                    <button className="task-check" type="button" aria-label={task.completed ? `标记${task.title}为未完成` : `完成${task.title}`} onClick={() => toggleTask(task.id)}>{task.completed && <Check size={14} strokeWidth={2.5} />}</button>
                    <span className={`task-subject-icon subject-${subjects.indexOf(task.subject)}`}><Icon size={17} /></span>
                    <div className="task-info"><strong>{task.title}</strong><span>{task.subject}</span></div>
                    <span className="task-duration"><Clock3 size={14} />{task.minutes} 分钟</span>
                    <span className={`task-status ${task.completed ? 'status-done' : ''}`}><i />{task.completed ? '已完成' : '待开始'}</span>
                    <button className="delete-task" type="button" aria-label={`删除${task.title}`} onClick={() => deleteTask(task.id)}><Trash2 size={15} /></button>
                  </article>
                )
              })}
            </div>

            <footer className="tasks-footer"><span>规划不必完美，开始就很好。</span><span>本地保存 · 仅此设备可见</span></footer>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
