import os
import requests
from time import sleep

def ping_url(url, delay, max_attempts):
    count = 0

    while count < max_attempts:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                print(f"Website {url} is reachable")
                return True
        except requests.ConnectionError:
            print(f"Website {url} is unreachable. Retrying in {delay} seconds...")
            sleep(delay)
            count += 1
        except requests.exceptions.MissingSchema:
            print(f"Invalid URL format: ${url}")
            return False

    return False

def run():
    website_url = os.getenv("INPUT_URL")
    max_attempts = int(os.getenv("INPUT_MAX_ATTEMPTS"))
    delay = int(os.getenv("INPUT_DELAY"))

    website_reachable = ping_url(website_url, delay, max_attempts)

    if not website_reachable:
        raise Exception(f"Website {website_url} is malformed or unreachable")

    print(f"Website {website_url} is reachable")

if __name__ == "__main__":
    run()
