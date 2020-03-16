#from selenium.webdriver import Chrome
from selenium import webdriver
from bs4 import BeautifulSoup
import requests
import json
import time

# webdriver = "C:/Users/hp/Documents/chromedriver_win32"
driver = webdriver.Chrome(executable_path=r'C:/Users/hp/Documents/chromedriver_win32/chromedriver.exe')
url = "https://one.ufl.edu/soc/"

# driver = Chrome(webdriver)
driver.get(url)
time.sleep(10)
html = driver.page_source
print (html)
