#!/bin/bash

# Git Sparse Checkout - Download specific directories from GitHub repositories
# Usage: ./git-sparse-download.sh <repo_url> <directory_path> [target_name]
# Example: ./git-sparse-download.sh https://github.com/google/guava guava-gwt
# Example: ./git-sparse-download.sh https://github.com/ComposioHQ/awesome-claude-skills skill-creator skills/skill-creator

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }

# Check arguments
if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
    echo "Usage: $0 <repo_url> <directory_path> [target_name]"
    echo ""
    echo "Arguments:"
    echo "  repo_url       - GitHub repository URL (e.g., https://github.com/user/repo)"
    echo "  directory_path - Path to the directory in the repo (e.g., src/components)"
    echo "  target_name    - Optional: Name for the downloaded directory (defaults to directory name)"
    echo ""
    echo "Examples:"
    echo "  $0 https://github.com/google/guava guava-gwt"
    echo "  $0 https://github.com/ComposioHQ/awesome-claude-skills skill-creator skills/my-skill"
    exit 1
fi

REPO_URL=$1
DIR_PATH=$2
TARGET_NAME=${3:-$(basename "$DIR_PATH")}

# Validate repo URL
if [[ ! "$REPO_URL" =~ ^https?://github\.com/.*$ ]]; then
    print_error "Invalid GitHub URL. URL must start with https://github.com/"
    exit 1
fi

# Clean up directory path (remove leading/trailing slashes)
DIR_PATH=$(echo "$DIR_PATH" | sed 's|^/||;s|/$||')

print_info "Repository: $REPO_URL"
print_info "Directory: $DIR_PATH"
print_info "Target: $TARGET_NAME"

# Create a temporary directory for the operation
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

print_info "Initializing sparse checkout..."

# Navigate to temp directory
cd "$TEMP_DIR" || exit 1

# Initialize empty git repo
git init -q 2>/dev/null || {
    print_error "Failed to initialize git repository"
    exit 1
}

# Add remote
git remote add origin "$REPO_URL" 2>/dev/null || {
    print_error "Failed to add remote repository"
    exit 1
}

# Configure sparse checkout
git config core.sparseCheckout true

# Handle both old and new sparse-checkout patterns
# Try new way first (Git 2.25+), fall back to old way
if command -v git sparse-checkout >/dev/null 2>&1 && git sparse-checkout init --cone 2>/dev/null; then
    # New sparse-checkout command available
    git sparse-checkout set "$DIR_PATH" 2>/dev/null || echo "$DIR_PATH" >> .git/info/sparse-checkout
else
    # Fall back to old method
    echo "$DIR_PATH/*" >> .git/info/sparse-checkout
    echo "$DIR_PATH/**" >> .git/info/sparse-checkout
fi

# Attempt to fetch and checkout
print_info "Downloading $DIR_PATH from repository..."

# Determine the default branch
DEFAULT_BRANCH=$(git ls-remote --symref origin HEAD 2>/dev/null | grep "ref:" | sed 's/.*refs\/heads\///' | sed 's/[[:space:]].*$//')
if [ -z "$DEFAULT_BRANCH" ]; then
    # Try common branch names
    for branch in main master; do
        if git ls-remote --heads origin $branch 2>/dev/null | grep -q $branch; then
            DEFAULT_BRANCH=$branch
            break
        fi
    done
fi

# If we still don't have a branch, default to main
DEFAULT_BRANCH=${DEFAULT_BRANCH:-main}

print_info "Using branch: $DEFAULT_BRANCH"

# Fetch with depth 1 for speed
if ! git fetch --depth=1 origin "$DEFAULT_BRANCH" 2>/dev/null; then
    print_error "Failed to fetch from repository. Please check the URL and your internet connection."
    exit 1
fi

# Checkout the fetched branch
if ! git checkout -f "origin/$DEFAULT_BRANCH" 2>/dev/null; then
    print_error "Failed to checkout repository content"
    exit 1
fi

# Check if the directory exists
if [ ! -d "$DIR_PATH" ]; then
    print_error "Directory '$DIR_PATH' not found in repository"
    print_info "Available directories in root:"
    ls -d */ 2>/dev/null | head -10 || echo "  (none found)"
    exit 1
fi

# Move the downloaded folder to the user's original location
print_info "Moving files to current directory..."

# Ensure we're back in the original directory
cd "$OLDPWD" || exit 1

# Check if target already exists
if [ -e "$TARGET_NAME" ]; then
    print_error "Target '$TARGET_NAME' already exists in current directory"
    echo "Please remove it first or choose a different target name"
    exit 1
fi

# Move the directory
if mv "$TEMP_DIR/$DIR_PATH" "$TARGET_NAME" 2>/dev/null; then
    print_success "Successfully downloaded '$DIR_PATH' as '$TARGET_NAME'"

    # Show what was downloaded
    echo ""
    echo "Downloaded structure:"
    if command -v tree >/dev/null 2>&1; then
        tree -L 2 "$TARGET_NAME" 2>/dev/null | head -20
    else
        ls -la "$TARGET_NAME" 2>/dev/null | head -10
    fi
else
    print_error "Failed to move directory to target location"
    exit 1
fi

# Additional info
echo ""
print_info "To use this as a Delano skill, copy it to .agents/skills/"
print_info "Compatibility mirror: .claude/skills/ when present"
print_info "Example: mv $TARGET_NAME .agents/skills/"
