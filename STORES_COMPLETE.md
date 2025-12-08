# Zustand Stores - Implementation Complete ✓

## All 7 Stores Created

### 1. **useLocationStore** (`/stores/useLocationStore.ts`)
- State: coordinates, nearestStation, neighborhood, loading, error
- Actions: setCoordinates, setNearestStation, setNeighborhood, setLoading, setError, reset
- **No persistence** (location is ephemeral)

### 2. **useWeatherStore** (`/stores/useWeatherStore.ts`)
- State: condition, temperature, loading
- Actions: setWeather, setLoading, reset
- **No persistence** (weather updates frequently)

### 3. **useBudgetStore** (`/stores/useBudgetStore.ts`)
- State: tripTotal, tripDays, dailyBudget, expenses[]
- Computed: spentToday(), remainingToday()
- Actions: setTripBudget, setDailyBudget, addExpense, removeExpense, reset
- **✓ Persisted to AsyncStorage** (`tomo-budget-storage`)
- Uses Unix timestamps (number) for expense tracking
- Filters today's expenses by date range

### 4. **useMovesStore** (`/stores/useMovesStore.ts`)
- State: moves[], selectedMoveId, loading, excludedMoveIds[]
- Actions: setMoves, selectMove, excludeMove, clearExcludedMoves, setLoading, reset
- **No persistence** (moves are generated fresh each session)
- Supports selection/deselection (toggle behavior)

### 5. **usePreferencesStore** (`/stores/usePreferencesStore.ts`)
- State: homeBase, walkingTolerance, budgetLevel, dietary[], interests[], avoidCrowds
- Actions: setHomeBase, setWalkingTolerance, setBudgetLevel, add/remove dietary/interests, setAvoidCrowds, reset
- **✓ Persisted to AsyncStorage** (`tomo-preferences-storage`)

### 6. **useTripStore** (`/stores/useTripStore.ts`)
- State: startDate, currentDay, visits[], completedMoveIds[], totalWalkingMinutes
- Actions: startTrip, addVisit, completeMove, addWalkingTime, reset
- **✓ Persisted to AsyncStorage** (`tomo-trip-storage`)

### 7. **useStampsStore** (`/stores/useStampsStore.ts`)
- State: stamps[], currentCity
- Computed: completedCount(), totalCount(), progressPercentage()
- Actions: loadStampsForCity, completeStamp, uncompleteStamp, reset
- **✓ Persisted to AsyncStorage** (`tomo-stamps-storage`)
- Intelligently merges city stamp data with completion status
- Uses Unix timestamps (number) for completedAt

---

## Multi-City Stamp System

### New Structure
```
/constants/stamps/
  ├── index.ts       # Export functions: getStampsForCity(), hasCityStamps(), getSupportedCities()
  └── tokyo.ts       # TOKYO_STAMPS array (15 curated experiences)
```

### API
- `getStampsForCity(cityName: string)` - Returns stamps array or null if city not supported
- `hasCityStamps(cityName: string)` - Check if city is supported
- `getSupportedCities()` - Returns array of supported city names

### Future-Ready
```typescript
// Easy to add new cities:
const CITY_STAMPS: Record<string, Stamp[]> = {
  tokyo: TOKYO_STAMPS,
  kyoto: KYOTO_STAMPS,    // ← Just add here
  osaka: OSAKA_STAMPS,    // ← And here
};
```

---

## Components Wired to Stores

### **BudgetBar** (`/components/BudgetBar.tsx`)
- ✓ Reads from `useBudgetStore`
- Removed props: `spent`, `daily`
- Now only needs: `timeOfDay`
- Automatically shows: spentToday / dailyBudget

### **MoveCard** (`/components/MoveCard.tsx`)
- ✓ Added `isSelected` prop
- Visual indicator: 2px border when selected
- Works with `useMovesStore.selectedMoveId`

### **Main Screen** (`/app/index.tsx`)
- ✓ All stores imported and initialized
- ✓ Mock data flows through stores
- ✓ Header reads from location + weather stores
- ✓ BudgetBar auto-wired
- ✓ Move cards show selection state
- ✓ Stamps initialized for Tokyo

---

## Initialization Logic (in index.tsx)

```typescript
useEffect(() => {
  // Location
  useLocationStore.getState().setNeighborhood('Shibuya');

  // Weather
  useWeatherStore.getState().setWeather('clear', 23);

  // Budget (only if not already set)
  const budgetStore = useBudgetStore.getState();
  if (budgetStore.dailyBudget === 0) {
    budgetStore.setTripBudget(70000, 7);  // ¥10,000/day for 7 days
    budgetStore.addExpense({
      id: '1',
      amount: 3500,
      category: 'food',
      note: 'Lunch at Tsukiji',
      timestamp: Date.now(),
    });
  }

  // Moves
  setMoves(MOCK_MOVES);

  // Stamps (only if not already loaded)
  const stampsStore = useStampsStore.getState();
  if (stampsStore.stamps.length === 0) {
    stampsStore.loadStampsForCity('tokyo');
  }
}, [setMoves]);
```

---

## Data Flow Architecture

### Before (Hardcoded Props)
```
Mock Data → Component Props → UI
```

### After (Store-Driven)
```
Mock Data → Zustand Stores → Component Selectors → UI
            ↓ (4 stores persist)
         AsyncStorage
```

---

## Type Safety

- ✓ All stores fully typed
- ✓ No `any` types
- ✓ Timestamps use `number` (Unix timestamps)
- ✓ `tsc --noEmit` passes with 0 errors

---

## Barrel Export

Created `/stores/index.ts` for cleaner imports:
```typescript
export { useLocationStore } from './useLocationStore';
export { useWeatherStore } from './useWeatherStore';
export { useBudgetStore } from './useBudgetStore';
export { useMovesStore } from './useMovesStore';
export { usePreferencesStore } from './usePreferencesStore';
export { useTripStore } from './useTripStore';
export { useStampsStore } from './useStampsStore';
```

---

## What's Next

### Ready for Real Data Integration
1. **Location Service** - Wire GPS → `useLocationStore`
2. **Weather Service** - OpenWeatherMap → `useWeatherStore`
3. **Claude API** - Generate moves → `useMovesStore`
4. **Chat Store** - Add `useChatStore` for conversation history

### UI to Build
- Chat sheet modal (expands from bottom)
- Stamps screen (15 Tokyo essentials checklist)
- Settings screen (preferences editor)
- Add expense modal (quick expense logging)

### Features to Implement
- Camera integration (scan signs/menus)
- Expense tracking (add/remove/categorize)
- Stamp completion (tap to mark done)
- Move navigation (get directions)

---

## File Count
- **7 Store Files**: All functional, typed, tested
- **1 Barrel Export**: `/stores/index.ts`
- **1 Stamps Index**: `/constants/stamps/index.ts`
- **1 Tokyo Stamps**: `/constants/stamps/tokyo.ts`

**Total: 10 new files**

---

✓ Zustand stores complete
✓ Multi-city stamp system ready
✓ Components wired
✓ Type-safe
✓ Persistence working
✓ Mock data flowing through stores
