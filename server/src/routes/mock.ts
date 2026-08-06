import { Router, Request, Response } from 'express';

const router = Router();

// Mock LinkedIn search results
router.get('/linkedin', (req: Request, res: Response) => {
  const keyword = (req.query.keywords as string) || 'React Developer';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mock LinkedIn Search - ${keyword}</title>
      <style>
        body { font-family: sans-serif; background: #f3f2ef; padding: 20px; }
        .search-results { max-width: 600px; margin: 0 auto; }
        .linkedin-profile-card { background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; border: 1px solid #e0e0e0; }
        .profile-name { font-size: 18px; font-weight: bold; color: #0a66c2; margin: 0 0 5px 0; }
        .profile-title { color: #666; margin: 0 0 10px 0; }
        .profile-link { text-decoration: none; color: white; background: #0a66c2; padding: 6px 12px; border-radius: 16px; display: inline-block; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="search-results">
        <h2>LinkedIn Search Results for "${keyword}"</h2>
        <div class="linkedin-profile-card">
          <h3 class="profile-name">Alex Rivera</h3>
          <p class="profile-title">Lead Frontend Engineer | Seeking ${keyword}</p>
          <a class="profile-link" href="http://localhost:5000/mock/linkedin/profile/alex-rivera">View Profile</a>
        </div>
        <div class="linkedin-profile-card">
          <h3 class="profile-name">Sarah Jenkins</h3>
          <p class="profile-title">Technical Recruiter at TechCorp (Hiring ${keyword}s)</p>
          <a class="profile-link" href="http://localhost:5000/mock/linkedin/profile/sarah-jenkins">View Profile</a>
        </div>
        <div class="linkedin-profile-card">
          <h3 class="profile-name">David Chen</h3>
          <p class="profile-title">CTO & Founder (Looking for freelancers with ${keyword} skills)</p>
          <a class="profile-link" href="http://localhost:5000/mock/linkedin/profile/david-chen">View Profile</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Mock LinkedIn Profile details
router.get('/linkedin/profile/:username', (req: Request, res: Response) => {
  const { username } = req.params;
  const name = username.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${name} | LinkedIn Profile</title>
      <style>
        body { font-family: sans-serif; background: #f3f2ef; padding: 20px; }
        .profile-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 25px; border: 1px solid #e0e0e0; }
        .profile-name { font-size: 24px; font-weight: bold; margin: 0 0 5px 0; }
        .profile-bio { font-size: 16px; color: #333; margin-bottom: 20px; line-height: 1.5; }
        .skills-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 25px; }
        .skill-tag { background: #e1f5fe; color: #0288d1; padding: 4px 10px; border-radius: 12px; font-size: 14px; }
        .action-btn { font-weight: bold; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-size: 14px; }
        .btn-primary { background: #0a66c2; color: white; margin-right: 10px; }
        .btn-secondary { background: white; color: #0a66c2; border: 1px solid #0a66c2; }
      </style>
    </head>
    <body>
      <div class="profile-container">
        <h1 class="profile-name">${name}</h1>
        <p class="profile-headline">Ecosystem Lead & Tech Recruiter</p>
        
        <h3>About</h3>
        <p class="profile-bio">
          Hi! I am ${name}. I build teams and source engineers. I am highly interested in typescript, react, node.js, rust, and AI integrations. If you are a student looking for internships or a freelancer looking for roles, connect with me!
        </p>

        <h3>Skills</h3>
        <div class="skills-list">
          <span class="skill-tag">Recruiting</span>
          <span class="skill-tag">React</span>
          <span class="skill-tag">TypeScript</span>
          <span class="skill-tag">Outreach</span>
        </div>

        <button class="action-btn btn-primary" onclick="alert('Connect request sent')">Connect</button>
        <button class="action-btn btn-secondary" onclick="window.location.href='/mock/linkedin/messages/${username}'">Message</button>
      </div>
    </body>
    </html>
  `);
});

// Mock LinkedIn Chat Inbox
router.get('/linkedin/messages/:username', (req: Request, res: Response) => {
  const { username } = req.params;
  const name = username.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Messages with ${name}</title>
      <style>
        body { font-family: sans-serif; background: #f3f2ef; padding: 20px; }
        .chat-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; display: flex; flex-direction: column; height: 500px; border: 1px solid #e0e0e0; }
        .chat-header { background: #0a66c2; color: white; padding: 15px; font-weight: bold; border-top-left-radius: 8px; border-top-right-radius: 8px; }
        .chat-messages { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
        .message { max-width: 75%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.4; }
        .message.received { background: #f3f2ef; align-self: flex-start; }
        .message.sent { background: #0a66c2; color: white; align-self: flex-end; }
        .chat-input-area { padding: 15px; border-top: 1px solid #e0e0e0; display: flex; gap: 10px; }
        .chat-input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
        .send-btn { background: #0a66c2; color: white; border: none; padding: 10px 18px; border-radius: 4px; cursor: pointer; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="chat-container">
        <div class="chat-header">Chat with ${name}</div>
        <div class="chat-messages" id="message-container">
          <div class="message received">Hello there! I saw your profile and skills list. Are you available for freelance projects starting next week?</div>
        </div>
        <div class="chat-input-area">
          <input type="text" class="chat-input" id="message-input" placeholder="Write a message...">
          <button class="send-btn" onclick="sendMessage()">Send</button>
        </div>
      </div>
      <script>
        function sendMessage() {
          const input = document.getElementById('message-input');
          const text = input.value.trim();
          if(!text) return;
          const container = document.getElementById('message-container');
          const bubble = document.createElement('div');
          bubble.className = 'message sent';
          bubble.innerText = text;
          container.appendChild(bubble);
          input.value = '';
          container.scrollTop = container.scrollHeight;
        }
      </script>
    </body>
    </html>
  `);
});

// Mock Twitter Search Results
router.get('/twitter', (req: Request, res: Response) => {
  const keyword = (req.query.keywords as string) || 'hiring freelancer';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mock Twitter Search - ${keyword}</title>
      <style>
        body { font-family: sans-serif; background: #ffffff; padding: 20px; color: #0f1419; }
        .timeline { max-width: 600px; margin: 0 auto; border-left: 1px solid #eff3f4; border-right: 1px solid #eff3f4; padding: 0 15px; }
        .twitter-tweet { padding: 15px; border-bottom: 1px solid #eff3f4; display: flex; flex-direction: column; }
        .tweet-header { display: flex; gap: 5px; font-size: 15px; margin-bottom: 5px; }
        .tweet-author { font-weight: bold; }
        .tweet-handle { color: #536471; }
        .tweet-text { font-size: 15px; line-height: 1.5; margin: 0 0 10px 0; }
        .tweet-link { color: #1d9bf0; text-decoration: none; font-size: 14px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="timeline">
        <h2>Twitter Search: "${keyword}"</h2>
        <div class="twitter-tweet">
          <div class="tweet-header">
            <span class="tweet-author">Elena Rostova</span>
            <span class="tweet-handle">@elena_codes</span>
          </div>
          <p class="tweet-text">Looking for a freelance developer who understands React, Node, and Tailwind. Must be available immediately for a 2-week sprint! Please DM me with your portfolio.</p>
          <a class="tweet-link" href="http://localhost:5000/mock/twitter/profile/elena_codes">View Profile</a>
        </div>
        <div class="twitter-tweet">
          <div class="tweet-header">
            <span class="tweet-author">Tech Career Partner</span>
            <span class="tweet-handle">@tech_partners</span>
          </div>
          <p class="tweet-text">Students, recruiters are looking for you! We have open internship opportunities for summer. Ping us or DM details.</p>
          <a class="tweet-link" href="http://localhost:5000/mock/twitter/profile/tech_partners">View Profile</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Mock Upwork Search Results
router.get('/upwork', (req: Request, res: Response) => {
  const keyword = (req.query.keywords as string) || 'React Developer';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mock Upwork Job Search</title>
      <style>
        body { font-family: sans-serif; background: #f1f2f4; padding: 20px; }
        .jobs-container { max-width: 800px; margin: 0 auto; }
        .upwork-job-card { background: white; border-radius: 8px; border: 1px solid #d5e0d5; padding: 20px; margin-bottom: 20px; }
        .job-title { font-size: 20px; font-weight: bold; color: #14a800; margin: 0 0 10px 0; text-decoration: none; display: inline-block; }
        .job-meta { font-size: 13px; color: #5e6d5e; margin-bottom: 10px; }
        .job-description { font-size: 15px; color: #333; line-height: 1.4; margin-bottom: 15px; }
        .job-post-link { display: inline-block; background: #14a800; color: white; text-decoration: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="jobs-container">
        <h2>Upwork Jobs for "${keyword}"</h2>
        
        <div class="upwork-job-card">
          <a class="job-title" href="#">Need expert ${keyword} for SaaS Dashboard</a>
          <div class="job-meta">Hourly: $35.00-$70.00 - Est. Time: Less than 1 month, <30 hrs/week - Posted 2 hours ago</div>
          <p class="job-description">We are launching a new analytics product and need an expert React developer with deep Tailwind CSS knowledge to help build a responsive dashboard. Integration with REST APIs is key.</p>
          <a class="job-post-link" href="http://localhost:5000/mock/upwork/job/saas-dashboard">View Job</a>
        </div>

        <div class="upwork-job-card">
          <a class="job-title" href="#">Full-stack Developer for Long-term project</a>
          <div class="job-meta">Fixed-price: $2,500 - Intermediate level - Posted 5 hours ago</div>
          <p class="job-description">Looking for a freelancer to help us build and maintain our node.js and react application. Skills in postgres, redis, and socket.io are highly desirable.</p>
          <a class="job-post-link" href="http://localhost:5000/mock/upwork/job/full-stack-long-term">View Job</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

export default router;
