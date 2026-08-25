import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('PIXEL BALL 화면', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('매치 프리뷰와 세 가지 난이도를 보여준다', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /THREE INNINGS/ })).toBeInTheDocument()
    expect(screen.getByText('휴대폰을 가로로 돌려주세요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /루키/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /프로/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /올스타/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /선택$/ })).toHaveLength(5)
    expect(screen.getByText('2026 대표 타자 선택')).toBeInTheDocument()
  })

  it('2026 선수 카드를 선택하면 기록과 경기 타자 HUD에 반영한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '오스틴 LG 트윈스 선택' }))

    expect(screen.getByText('1.054')).toBeInTheDocument()
    expect(screen.getByText('거포 슬러거')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /경기 시작/ }))
    act(() => vi.advanceTimersByTime(1100))
    expect(screen.getByLabelText('현재 타자 오스틴')).toBeInTheDocument()
  })

  it('선택한 난이도로 경기를 시작하고 1회초 타격 화면으로 전환한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /올스타/ }))
    fireEvent.click(screen.getByRole('button', { name: /경기 시작/ }))

    expect(screen.getByRole('table', { name: '이닝별 점수' })).toBeInTheDocument()
    expect(screen.getAllByText('1회초')).toHaveLength(2)

    act(() => vi.advanceTimersByTime(1100))
    expect(screen.getByRole('button', { name: /스윙/ })).toBeDisabled()
    expect(screen.getByText(/구자욱 · 올스타 MODE/)).toBeInTheDocument()
  })

  it('효과음 버튼과 키보드 M으로 음소거 상태를 바꾼다', () => {
    render(<App />)
    const mute = screen.getByRole('button', { name: '효과음 끄기' })
    fireEvent.click(mute)
    expect(screen.getByRole('button', { name: '효과음 켜기' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'm' })
    expect(screen.getByRole('button', { name: '효과음 끄기' })).toBeInTheDocument()
  })

  it('경기 중 ESC로 일시정지하고 계속할 수 있다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /경기 시작/ }))
    act(() => vi.advanceTimersByTime(1100))

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByText('잠시 멈췄습니다')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }))
    expect(screen.queryByText('잠시 멈췄습니다')).not.toBeInTheDocument()
  })
})
