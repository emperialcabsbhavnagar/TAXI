# Empire Cab Platform Repository Synchronization Guide

> [!IMPORTANT]
> **PRIMARY REPOSITORY**: `https://github.com/emperialcabsbhavnagar/TAXI.git`
> **PRODUCTION BRANCH**: `main`

## Git Remote Configuration
The primary production repository for this codebase is set to:
`https://github.com/emperialcabsbhavnagar/TAXI.git`

### Command to Verify Remote:
```bash
git remote -v
# Output should be:
# origin  https://github.com/emperialcabsbhavnagar/TAXI.git (fetch)
# origin  https://github.com/emperialcabsbhavnagar/TAXI.git (push)
```

### Command to Save & Push Changes:
```bash
git add .
git commit -m "Your descriptive commit message"
git push origin main
```

---

### Registered Deployment Links:
- 🚖 **Admin Portal**: [https://taxii-yth5.vercel.app/admin](https://taxii-yth5.vercel.app/admin)
- 📱 **Android App**: [https://androidapp-omega.vercel.app](https://androidapp-omega.vercel.app)
- 🍎 **iOS / Web Customer Platform**: [https://taxii-yth5.vercel.app](https://taxii-yth5.vercel.app)
