import React from 'react'
import Chat from './Chat'
import VideoChat from './VideoChat'

function Dashboard() {
  return (
    <div className='flex h-screen flex-col sm:flex-row  bg-neutral-200 '>
      <VideoChat />
      <Chat/>
    </div>
  )
}

export default Dashboard