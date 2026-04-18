# 🛡️ Safe User Property Access Pattern

## The Problem: "Cannot read properties of undefined (reading 'email')"

Your app had inconsistent user state handling:

```js
// ❌ WRONG - Assumes user always exists
const email = user.email;           // Crashes if user is null/undefined
currentUser.walletAddress;          // Crashes during auth loading/failure

// ✅ CORRECT - Handles null/undefined gracefully
const email = user?.email;          // Optional chaining - returns undefined if user is null
const name = currentUser?.name ?? 'Guest';  // Nullish coalescing - provides default
```

---

## ✅ User State Lifecycle

```
User can be in these states:

1. null/undefined       → Not logged in (initial state)
2. undefined            → Auth request in progress (loading)
3. undefined            → Auth request failed
4. { id, email, ... }   → Logged in (success)
```

**Your code must handle states 1, 2, 3 gracefully.**

---

## Pattern: Safe Property Access

### ❌ UNSAFE (Will crash)

```jsx
// In App.jsx or any component receiving currentUser
const handleSubmit = async (e) => {
  const userId = currentUser.id;           // CRASH if currentUser is null
  const email = currentUser.email;         // CRASH
  const wallet = currentUser.walletAddress; // CRASH
};
```

### ✅ SAFE (Won't crash)

```jsx
const handleSubmit = async (e) => {
  // Check before use
  if (!currentUser) {
    toast("Please sign in first", "error");
    return;
  }
  
  // Now safe to access
  const userId = currentUser.id;
  const email = currentUser.email;
};
```

### ✅ OPTIONAL CHAINING (Graceful fallback)

```jsx
// Returns undefined if currentUser is null, doesn't crash
<span>{currentUser?.email}</span>

// Returns 'Guest' if currentUser is null
<span>{currentUser?.email ?? 'Guest'}</span>

// Nested property access
<span>{currentUser?.wallet?.address ?? 'No wallet'}</span>
```

---

## Fixes Applied ✅

### 1. **RampPage.js** - Added user check

```jsx
// BEFORE
const handleSubmit = async (e) => {
  body: JSON.stringify({
    walletAddress: user.walletAddress,  // CRASH if user is null
  })
}

// AFTER
const handleSubmit = async (e) => {
  if (!user) {
    onShowToast('Please sign in first', 'error');
    return;
  }
  body: JSON.stringify({
    walletAddress: user.walletAddress,  // SAFE - checked above
  })
}
```

### 2. **TransferPage.js** - Added user check

```jsx
// SAME pattern as RampPage
if (!user) {
  onShowToast('Please sign in first', 'error');
  return;
}
```

### 3. **DashboardRefactored.jsx** - Added optional chaining + fallback

```jsx
// BEFORE
<span>{currentUser.email}</span>  // CRASH if currentUser is null

// AFTER
<span>{currentUser?.email || 'Not logged in'}</span>  // Safe fallback
```

---

## Checklist: Safe User Access

When accessing user properties **everywhere** in frontend:

```
☑  const user = data.data?.user              // Optional chaining on response
☑  if (!user) { return handleError(); }     // Check before use
☑  const name = user?.name ?? 'Guest';      // Use ?? for defaults
☑  {currentUser && <MyComponent />}          // Render only if logged in
☑  walletAddress: user?.walletAddress       // Optional chaining in JSX
```

---

## Examples by Component Type

### Example 1: Page receiving `user` prop

```jsx
const RampPage = ({ user, onShowToast }) => {
  const handleSubmit = async (e) => {
    if (!user) {                          // ✅ CHECK FIRST
      onShowToast('Please sign in', 'error');
      return;
    }
    
    const response = await fetch('/api/ramp', {
      body: JSON.stringify({
        userId: user.id,                  // ✅ SAFE - checked above
        wallet: user.walletAddress,       // ✅ SAFE
      })
    });
  };
};
```

### Example 2: Component rendering conditional content

```jsx
const UserProfile = ({ currentUser }) => {
  return (
    <>
      {currentUser && (                          // ✅ CHECK FIRST
        <div>
          <p>Email: {currentUser.email}</p>      // ✅ SAFE - guarded
          <p>Wallet: {currentUser?.walletAddress || 'None'}</p>  // ✅ SAFE
        </div>
      )}
      {!currentUser && (                         // ✅ RENDER LOGIN
        <p>Please sign in to view profile</p>
      )}
    </>
  );
};
```

### Example 3: API calls using stored user

```jsx
const getBalance = async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user?.id) {                             // ✅ CHECK FIRST
    toast('Not authenticated', 'error');
    return;
  }
  
  const response = await fetch(`/api/user/${user.id}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`  // ✅ SAFE
    }
  });
};
```

---

## Mental Model

Always think:

```
User state is:
  null           (not logged in)
  undefined      (loading / error)
  { object }     (logged in)

NEVER assume state == object
ALWAYS check before accessing properties
ALWAYS provide fallbacks
```

---

## Summary

Your app is now **safe** because:

1. ✅ RampPage checks `if (!user)` before accessing `user.walletAddress`
2. ✅ TransferPage checks `if (!user)` before accessing `user.walletAddress`
3. ✅ DashboardRefactored uses `currentUser?.email ?? 'Not logged in'` (safe fallback)
4. ✅ All auth responses use optional chaining: `data.data?.user`
5. ✅ All API functions check `if (!currentUser) { return; }`

**No more "Cannot read properties of undefined" errors!** 🎉
