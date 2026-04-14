# Quick Testing Guide - Todo Dashboard Enhancements

## 🚀 Quick Start Testing

### Prerequisites
- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:3000`
- MongoDB connection active

---

## ✅ Test Scenarios

### Test 1: Normal Plan Task Limit
**Objective**: Verify Normal plan users can only create 5 tasks

**Steps**:
1. Create a new account
2. Click the green **"+"** button (bottom-right)
3. Add tasks one by one with titles: "Task 1", "Task 2", etc.
4. After adding 5 tasks:
   - ✅ The **"+"** button should turn **gray**
   - ✅ Clicking it should show: "Upgrade to Premium to add more tasks!"
5. Count remaining tasks number in the add dialog: Should show "(0 left)"

**Expected Result**: ✅ Can create max 5 tasks, button becomes disabled after

---

### Test 2: Profile Component Display
**Objective**: Verify profile displays correct user information

**Steps**:
1. Click the **👤** (User icon) button in top-right corner
2. Verify the profile dialog shows:
   - ✅ User's name
   - ✅ User's email
   - ✅ Plan badge ("NORMAL PLAN")
   - ✅ Three statistics: Total, Completed, Pending
   - ✅ Plan status box showing task limits

**Expected Result**: ✅ Profile displays all information correctly

---

### Test 3: Normal Plan Progress Bar
**Objective**: Verify progress bar shows proper task limit visualization

**Steps**:
1. Open profile (click **👤** icon)
2. Look at the plan status section
3. Verify progress bar shows:
   - ✅ "Tasks left: X out of 5"
   - ✅ Progress bar fills as you add more tasks
   - ✅ After 5 tasks: Progress bar is completely full (100%)
   - ✅ "Upgrade to Premium" button visible

**Expected Result**: ✅ Progress visualization is smooth and accurate

---

### Test 4: Add Button Hover Animation
**Objective**: Verify UI animations work smoothly

**Steps**:
1. Hover over the green **"+"** button (bottom-right)
2. Observe:
   - ✅ Button scales up slightly (hover:scale-110)
   - ✅ Green glow appears around button
   - ✅ Shadow effect increases
   - ✅ Smooth 300ms transition

**Expected Result**: ✅ Smooth, visually pleasing hover effect

---

### Test 5: Add Task Enhanced Form
**Objective**: Verify improved form UI

**Steps**:
1. Click the green **"+"** button to open add task dialog
2. Verify:
   - ✅ Dialog header shows plan status ("📝 Add Task (5 left)" or "✨ Add New Task")
   - ✅ Priority field has emoji icons: 🔴 High, 🟡 Medium, 🟢 Low
   - ✅ All fields are properly labeled
   - ✅ Title field is marked with red asterisk (required)
   - ✅ Submit button is disabled until title is entered
3. Fill in title and click "Add Task"
   - ✅ Loading state shows "Adding..."
   - ✅ Task appears in list after submission
   - ✅ Dialog closes automatically

**Expected Result**: ✅ Easy-to-use form with clear feedback

---

### Test 6: Backend Error Handling
**Objective**: Verify backend rejects tasks exceeding limit

**Steps**:
1. Using API client (Postman, curl, etc.), simulate task creation after limit
2. Send POST request to `/api/tasks` with user at 5 tasks
3. Expected Response:
   ```json
   {
     "detail": "Upgrade to Premium to add more tasks"
   }
   ```
4. Status Code: **403 Forbidden**

**Expected Result**: ✅ Backend properly enforces plan limits

---

### Test 7: Premium Plan (Manual Database Test)
**Objective**: Verify Premium plan has no task limits

**Steps**:
1. In MongoDB, find a user document
2. Update the plan field: `{$set: {plan: "premium"}}`
3. Log out and log back in as that user
4. Verify:
   - ✅ Green **"+"** button is **always enabled**
   - ✅ Open profile → shows "✨ Unlimited tasks" with trophy icon
   - ✅ Can add unlimited tasks (test by adding 10+ tasks)
   - ✅ No progress bar, just unlimited indicator

**Expected Result**: ✅ Premium users have no task restrictions

---

### Test 8: Profile Update After Adding Tasks
**Objective**: Verify profile statistics update correctly

**Steps**:
1. Open profile and note current statistics
2. Add 2 new tasks and complete 1
3. Close profile
4. Open profile again
5. Verify:
   - ✅ Total tasks increased by 2
   - ✅ Completed tasks increased by 1
   - ✅ Pending tasks increased by 1
   - ✅ Remaining tasks count decreased

**Expected Result**: ✅ Statistics update in real-time

---

### Test 9: Upgrade Button Interaction
**Objective**: Verify upgrade button shows loading state

**Steps**:
1. Open profile
2. Click "Upgrade to Premium" button
3. Observe:
   - ✅ Button shows "Processing..." state
   - ✅ Button is disabled during loading
   - ✅ Alert shows message (placeholder for Razorpay)
   - ✅ Button returns to normal state

**Expected Result**: ✅ Upgrade button provides user feedback

---

### Test 10: Responsive Design
**Objective**: Verify components work on different screen sizes

**Steps**:
1. Open dashboard on desktop (1920px)
2. Verify:
   - ✅ Profile dialog centered
   - ✅ Add task button visible at bottom-right
   - ✅ Header layout proper

3. Resize to tablet (768px)
2. Verify:
   - ✅ Layout adapts
   - ✅ Buttons still accessible
   - ✅ Dialog still readable

4. Resize to mobile (375px)
2. Verify:
   - ✅ Everything still works
   - ✅ Profile dialog fullscreen
   - ✅ Add button accessible

**Expected Result**: ✅ Responsive across all screen sizes

---

## 🐛 Common Issues & Fixes

### Issue: Plan not showing in profile
**Fix**: Clear browser cookies and log in again, or restart backend

### Issue: Add button not disabling at limit
**Fix**: Check browser console for errors, verify stats fetching works

### Issue: Profile numbers don't update
**Fix**: Refresh the page or close/reopen profile dialog

### Issue: Animations not smooth
**Fix**: Close excessive browser tabs, check for JavaScript console errors

---

## 📝 Data to Track During Testing

- [ ] Total tasks created during test
- [ ] Number of profile views
- [ ] Add button clicks (enabled vs disabled)
- [ ] Any error messages encountered
- [ ] Animation smoothness rating (1-5)
- [ ] Form usability (easy/moderate/hard)

---

## ✨ Success Criteria

- ✅ Normal plan enforces 5-task limit
- ✅ Premium plan has unlimited tasks (manual test)
- ✅ Profile displays accurate information
- ✅ Add button animations are smooth
- ✅ Error messages are user-friendly
- ✅ UI is responsive on all devices
- ✅ No console errors encountered
- ✅ All interactions provide feedback

---

## 🎯 Performance Baseline

- Profile load time: < 500ms
- Add task dialog open: < 300ms
- Animation frame rate: 60fps
- No UI jank when adding tasks

---

## 📞 Support Notes

If you encounter issues:
1. Check browser console (F12 → Console)
2. Check network tab for failing requests
3. Verify backend is running and responsive
4. Check MongoDB connection
5. Review backend logs for error details

---

**Happy Testing!** 🚀
